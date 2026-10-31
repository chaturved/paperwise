import hashlib
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.enums import DocumentStatus
from src.core.exceptions import BadRequestError
from src.integrations.ai.base import AIProvider
from src.integrations.documents import Page, ReadableTextExtractor
from src.integrations.storage import S3Storage, StorageError
from src.repositories.library_repository import LibraryRepositoryProtocol
from src.services.ingestion_service import (
    DUPLICATE_MESSAGE,
    INTERRUPTED_MESSAGE,
    RETRYABLE_MESSAGE,
    IngestionService,
)
from src.utils.text_utils import TextChunker

RAW = b"file bytes"
RAW_HASH = hashlib.sha256(RAW).hexdigest()


def _lib(id=1, status=DocumentStatus.PROCESSING, path="https://s/object/library/1/x/a.pdf"):
    lib = MagicMock()
    lib.id, lib.user_id, lib.status, lib.path, lib.size, lib.type = id, 7, status, path, len(RAW), "pdf"
    return lib


class TestProcess:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.repo.get_by_content_hash.return_value = None
        self.storage = MagicMock(spec_set=S3Storage)
        self.storage.key_from_path.return_value = "1/x/a.pdf"
        self.storage.download.return_value = RAW
        self.ai = MagicMock(spec_set=AIProvider)
        self.ai.get_embeddings = AsyncMock(side_effect=lambda chunks: [[0.1] for _ in chunks])
        self.reader = MagicMock(spec_set=ReadableTextExtractor)
        self.service = IngestionService(self.repo, self.storage, self.ai, self.reader, TextChunker())
        self.lib = _lib()
        self.repo.get.return_value = self.lib

    async def _process(self, pages=None):
        self.reader.extract = AsyncMock(return_value=pages or [Page(1, "Payment is due in 30 days.")])
        await self.service.process(1)

    async def test_indexes_the_file_and_marks_it_ready(self):
        await self._process([Page(1, "Payment is due in 30 days.")])

        self.storage.download.assert_called_once_with("1/x/a.pdf", len(RAW))
        args = self.repo.finish_processing.call_args.args
        assert args[0] is self.lib and args[1] == "Payment is due in 30 days." and args[2] == RAW_HASH
        assert [c.chunk_index for c in args[3]] == list(range(len(args[3]))) and args[3]
        self.repo.set_status.assert_not_called()

    async def test_every_chunk_keeps_the_page_it_came_from(self):
        await self._process([Page(1, "alpha " * 100), Page(2, "beta " * 100), Page(None, "gamma")])

        chunks = self.repo.finish_processing.call_args.args[3]
        pages = [c.page_number for c in chunks]
        assert pages == sorted(pages, key=lambda n: (n is None, n))
        assert set(pages) == {1, 2, None}
        assert all(("alpha" in c.chunk_text) == (c.page_number == 1) for c in chunks)
        assert [c.chunk_index for c in chunks] == list(range(len(chunks)))

    @pytest.mark.parametrize("status", [DocumentStatus.READY, DocumentStatus.FAILED, DocumentStatus.UPLOADING])
    async def test_ignores_documents_that_are_not_waiting_to_be_processed(self, status):
        self.repo.get.return_value = _lib(status=status)

        await self._process()

        self.storage.download.assert_not_called()

    async def test_ignores_a_document_that_no_longer_exists(self):
        self.repo.get.return_value = None

        await self._process()

        self.storage.download.assert_not_called()

    async def test_fails_permanently_on_a_duplicate_and_removes_the_file(self):
        self.repo.get_by_content_hash.return_value = _lib(id=99)

        await self._process()

        self.repo.set_status.assert_called_once_with(self.lib, DocumentStatus.FAILED, DUPLICATE_MESSAGE)
        self.storage.delete_file.assert_called_once_with(self.lib.path)
        self.repo.finish_processing.assert_not_called()

    async def test_the_same_document_is_not_its_own_duplicate(self):
        self.repo.get_by_content_hash.return_value = self.lib

        await self._process()

        self.repo.finish_processing.assert_called_once()

    async def test_fails_permanently_when_the_file_cannot_be_read(self):
        self.reader.extract = AsyncMock(side_effect=BadRequestError("This file couldn't be read."))
        await self.service.process(1)

        self.repo.set_status.assert_called_once_with(self.lib, DocumentStatus.FAILED, "This file couldn't be read.")
        self.storage.delete_file.assert_called_once_with(self.lib.path)

    async def test_keeps_the_file_when_embedding_fails_so_it_can_be_retried(self):
        self.ai.get_embeddings = AsyncMock(side_effect=RuntimeError("provider down"))

        await self._process()

        self.repo.set_status.assert_called_once_with(self.lib, DocumentStatus.FAILED, RETRYABLE_MESSAGE)
        self.storage.delete_file.assert_not_called()

    async def test_keeps_the_file_on_a_storage_error(self):
        self.storage.download.side_effect = StorageError("storage down")

        await self._process()

        self.repo.set_status.assert_called_once_with(self.lib, DocumentStatus.FAILED, RETRYABLE_MESSAGE)
        self.storage.delete_file.assert_not_called()

    async def test_rolls_back_before_recording_a_failure(self):
        self.ai.get_embeddings = AsyncMock(side_effect=RuntimeError("boom"))
        order = []
        self.repo.rollback.side_effect = lambda: order.append("rollback")
        self.repo.set_status.side_effect = lambda *a, **k: order.append("set_status")

        await self._process()

        assert order == ["rollback", "set_status"]

    async def test_does_nothing_more_if_the_user_deleted_it_meanwhile(self):
        self.ai.get_embeddings = AsyncMock(side_effect=RuntimeError("boom"))
        self.repo.get.side_effect = [self.lib, None]

        await self._process()

        self.repo.set_status.assert_not_called()

    async def test_a_failure_to_remove_the_file_does_not_hide_the_real_error(self):
        self.repo.get_by_content_hash.return_value = _lib(id=99)
        self.storage.delete_file.side_effect = StorageError("cannot delete")

        await self._process()

        self.repo.set_status.assert_called_once_with(self.lib, DocumentStatus.FAILED, DUPLICATE_MESSAGE)


class TestRecoverInterrupted:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.storage = MagicMock(spec_set=S3Storage)
        self.service = IngestionService(
            self.repo,
            self.storage,
            MagicMock(spec_set=AIProvider),
            MagicMock(spec_set=ReadableTextExtractor),
            TextChunker(),
        )

    def test_marks_stuck_processing_documents_as_failed_and_removes_abandoned_uploads(self):
        stuck, abandoned = (
            _lib(id=1),
            _lib(id=2, status=DocumentStatus.UPLOADING, path="https://s/object/library/2/y/b.pdf"),
        )
        self.repo.list_stale.side_effect = lambda statuses, cutoff: {
            DocumentStatus.PROCESSING: [stuck],
            DocumentStatus.UPLOADING: [abandoned],
        }[statuses[0]]

        self.service.recover_interrupted()

        self.repo.set_status.assert_called_once_with(stuck, DocumentStatus.FAILED, INTERRUPTED_MESSAGE)
        self.storage.delete_file.assert_called_once_with(abandoned.path)
        self.repo.delete.assert_called_once_with(abandoned)

    def test_uses_older_cutoffs_for_uploads_than_for_processing(self):
        self.repo.list_stale.return_value = []

        self.service.recover_interrupted()

        cutoffs = {call.args[0][0]: call.args[1] for call in self.repo.list_stale.call_args_list}
        assert isinstance(cutoffs[DocumentStatus.PROCESSING], datetime)
        assert cutoffs[DocumentStatus.UPLOADING] < cutoffs[DocumentStatus.PROCESSING]

    def test_does_nothing_when_nothing_is_stale(self):
        self.repo.list_stale.return_value = []

        self.service.recover_interrupted()

        self.repo.set_status.assert_not_called()
        self.repo.delete.assert_not_called()


class TestReindex:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.repo.get_by_content_hash.return_value = None
        self.storage = MagicMock(spec_set=S3Storage)
        self.storage.key_from_path.return_value = "1/x/a.pdf"
        self.storage.download.return_value = RAW
        self.ai = MagicMock(spec_set=AIProvider)
        self.ai.get_embeddings = AsyncMock(side_effect=lambda chunks: [[0.1] for _ in chunks])
        self.reader = MagicMock(spec_set=ReadableTextExtractor)
        self.reader.extract = AsyncMock(return_value=[Page(1, "Payment is due in 30 days.")])
        self.service = IngestionService(self.repo, self.storage, self.ai, self.reader, TextChunker())
        self.lib = _lib(status=DocumentStatus.READY)
        self.repo.get.return_value = self.lib
        self.repo.transition_status.return_value = True

    async def test_replaces_the_chunks_of_a_ready_document(self):
        assert await self.service.reindex(1) is True

        self.repo.transition_status.assert_called_once_with(1, DocumentStatus.READY, DocumentStatus.PROCESSING)
        self.repo.finish_processing.assert_called_once()
        self.storage.delete_file.assert_not_called()

    async def test_ignores_a_document_that_is_not_ready(self):
        self.repo.transition_status.return_value = False

        assert await self.service.reindex(1) is False

        self.repo.finish_processing.assert_not_called()

    @pytest.mark.parametrize(
        "error", [BadRequestError("too large"), RuntimeError("provider down"), StorageError("down")]
    )
    async def test_a_failure_leaves_the_document_ready_and_keeps_its_file(self, error):
        self.reader.extract = AsyncMock(side_effect=error)

        assert await self.service.reindex(1) is False

        self.repo.finish_processing.assert_not_called()
        self.repo.set_status.assert_called_once_with(self.lib, DocumentStatus.READY)
        self.storage.delete_file.assert_not_called()
