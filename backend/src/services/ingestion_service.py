import hashlib
import logging
from datetime import UTC, datetime, timedelta

from fastapi.concurrency import run_in_threadpool

from src.config import settings
from src.core.enums import DocumentStatus
from src.core.exceptions import AppError, ConflictError
from src.integrations.ai.base import AIProvider
from src.integrations.documents import ReadableTextExtractor
from src.integrations.storage import S3Storage, StorageError
from src.models import Library, LibraryChunk
from src.repositories.library_repository import LibraryRepositoryProtocol
from src.utils.text_utils import TextChunker

_log = logging.getLogger(__name__)

DUPLICATE_MESSAGE = "This file has already been uploaded"
RETRYABLE_MESSAGE = "We couldn't finish processing this file. Please try again."
INTERRUPTED_MESSAGE = "Processing was interrupted. Please try again."


class IngestionService:
    """Turns a stored upload into searchable chunks, in the background.

    Built by hand in core/jobs.py with its own database session, because the request that scheduled the
    work is over by the time it runs.
    """

    def __init__(
        self,
        repo: LibraryRepositoryProtocol,
        storage: S3Storage,
        ai: AIProvider,
        reader: ReadableTextExtractor,
        chunker: TextChunker,
    ) -> None:
        self.repo = repo
        self.storage = storage
        self.ai = ai
        self.reader = reader
        self.chunker = chunker

    async def process(self, doc_id: int) -> None:
        lib = self.repo.get(doc_id)
        if lib is None or lib.status != DocumentStatus.PROCESSING:
            return

        try:
            await self._index(lib)
        except StorageError:
            # Storage trouble is usually temporary, so keep the file and let the user retry.
            _log.exception("Storage error while processing document %s", doc_id)
            self._fail(doc_id, RETRYABLE_MESSAGE, remove_file=False)
        except AppError as exc:
            # The file itself is the problem (unreadable, too large, a duplicate): retrying cannot help.
            self._fail(doc_id, exc.message, remove_file=True)
        except Exception:  # noqa: BLE001 - whatever went wrong, record it so the document is not stuck processing
            _log.exception("Failed to process document %s", doc_id)
            self._fail(doc_id, RETRYABLE_MESSAGE, remove_file=False)

    async def _index(self, lib: Library) -> None:
        key = self.storage.key_from_path(lib.path or "")
        raw = await run_in_threadpool(self.storage.download, key, lib.size)

        content_hash = hashlib.sha256(raw).hexdigest()
        existing = self.repo.get_by_content_hash(lib.user_id, content_hash)
        if existing is not None and existing.id != lib.id:
            raise ConflictError(DUPLICATE_MESSAGE)

        pages = await self.reader.extract(raw, lib.type)
        passages = [(page.number, text) for page in pages for text in self.chunker.chunk(page.text)]
        embeddings = await self.ai.get_embeddings([text for _, text in passages])

        self.repo.finish_processing(
            lib,
            "\n".join(page.text for page in pages),
            content_hash,
            [
                LibraryChunk(
                    library_id=lib.id, chunk_index=i, chunk_text=text, page_number=number, embedding=embedding
                )
                for i, ((number, text), embedding) in enumerate(zip(passages, embeddings))
            ],
        )

    async def reindex(self, doc_id: int) -> bool:
        """Re-process a document that is already ready, for example to record page numbers.

        Unlike process(), this never removes the stored file: if anything goes wrong the document goes back
        to ready with its existing chunks, which are only replaced once the new ones are complete.
        """
        if not self.repo.transition_status(doc_id, DocumentStatus.READY, DocumentStatus.PROCESSING):
            return False
        lib = self.repo.get(doc_id)
        try:
            await self._index(lib)
        except Exception:  # noqa: BLE001 - any failure leaves the document as it was
            _log.exception("Could not re-index document %s", doc_id)
            self.repo.rollback()
            self.repo.set_status(self.repo.get(doc_id), DocumentStatus.READY)
            return False
        return True

    def _fail(self, doc_id: int, message: str, remove_file: bool) -> None:
        self.repo.rollback()
        lib = self.repo.get(doc_id)
        if lib is None:  # the user deleted it while it was processing
            return
        if remove_file:
            self._remove_file(lib)
        self.repo.set_status(lib, DocumentStatus.FAILED, message)

    def _remove_file(self, lib: Library) -> None:
        if not lib.path:
            return
        try:
            self.storage.delete_file(lib.path)
        except StorageError:
            _log.warning("Could not remove stored file %s", lib.path, exc_info=True)

    def recover_interrupted(self) -> None:
        """Run at startup: documents left half-done by a restart or an abandoned upload are cleaned up."""
        now = datetime.now(UTC)

        processing_cutoff = now - timedelta(minutes=settings.STALE_PROCESSING_MINUTES)
        for lib in self.repo.list_stale([DocumentStatus.PROCESSING], processing_cutoff):
            self.repo.set_status(lib, DocumentStatus.FAILED, INTERRUPTED_MESSAGE)

        upload_cutoff = now - timedelta(hours=settings.STALE_UPLOAD_HOURS)
        for lib in self.repo.list_stale([DocumentStatus.UPLOADING], upload_cutoff):
            self._remove_file(lib)
            self.repo.delete(lib)
