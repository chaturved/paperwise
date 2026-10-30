import hashlib
import logging
from typing import Protocol

from fastapi import Depends, UploadFile
from fastapi.concurrency import run_in_threadpool

from src.core.enums import Plan
from src.core.exceptions import BadRequestError, NotFoundError, UploadFailedError
from src.models import Library, LibraryChunk
from src.repositories.library_repository import LibraryRepository, LibraryRepositoryProtocol
from src.schemas.library import LibraryDocResponse, LibraryResponse, UploadErrorResponse, UploadItemResponse, UploadResponse
from src.schemas.user import MessageResponse
from src.services.tier_service import TierService, TierServiceProtocol
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
from src.integrations.storage import S3Storage
from src.utils.text_utils import chunk_text, clean_text, extract_text_from_bytes

_log = logging.getLogger(__name__)


class LibraryServiceProtocol(Protocol):
    def get_library_data(self, user_id: int) -> LibraryResponse: ...
    async def save_files(self, user_id: int, plan: Plan, files: list[UploadFile]) -> UploadResponse: ...
    def delete_document(self, doc_id: int, user_id: int) -> MessageResponse: ...
    def clear_all(self, user_id: int) -> MessageResponse: ...


class LibraryService(LibraryServiceProtocol):
    def __init__(
        self,
        repo: LibraryRepositoryProtocol = Depends(LibraryRepository),
        tier: TierServiceProtocol = Depends(TierService),
        storage: S3Storage = Depends(S3Storage),
        ai: AIProvider = Depends(get_ai_provider),
    ) -> None:
        self.repo = repo
        self.tier = tier
        self.storage = storage
        self.ai = ai

    def get_library_data(self, user_id: int) -> LibraryResponse:
        rows = self.repo.get_all(user_id)
        return LibraryResponse(
            count=len(rows),
            total_size_bytes=sum(r.size for r in rows),
            sections=[LibraryDocResponse.model_validate(r) for r in rows],
        )

    async def save_files(self, user_id: int, plan: Plan, files: list[UploadFile]) -> UploadResponse:
        current_count = len(self.repo.get_all(user_id))
        self.tier.check_upload(plan, files, current_count)

        uploaded: list[UploadItemResponse] = []
        errors: list[UploadErrorResponse] = []

        for f in files:
            try:
                raw = await f.read()
                content_hash = hashlib.sha256(raw).hexdigest()
                if self.repo.get_by_content_hash(user_id, content_hash):
                    raise ValueError("This file has already been uploaded")
                f.file.seek(0)

                ext = (f.filename or "").split(".")[-1].lower()
                extracted_text = await run_in_threadpool(extract_text_from_bytes, raw, ext)
                if not clean_text(extracted_text):
                    raise BadRequestError(
                        "No readable text found. Scanned or image-only files aren't supported yet."
                    )

                file_url, contents = await self.storage.save_raw_file(f, user_id)
                size_bytes = len(contents)

                chunks = chunk_text(extracted_text)
                embeddings = await self.ai.get_embeddings(chunks)

                library = Library(
                    user_id=user_id,
                    name=f.filename,
                    type=ext,
                    size=size_bytes,
                    path=file_url,
                    extracted_text=extracted_text,
                    content_hash=content_hash,
                )
                library = self.repo.add(library)

                chunk_records = [
                    LibraryChunk(
                        library_id=library.id,
                        chunk_index=i,
                        chunk_text=chunk_txt,
                        embedding=emb,
                    )
                    for i, (chunk_txt, emb) in enumerate(zip(chunks, embeddings))
                ]
                self.repo.add_chunks(chunk_records)
                f.file.seek(0)
                uploaded.append(UploadItemResponse.model_validate(library))
            except Exception as e:
                _log.exception("Failed to process upload %s", f.filename)
                errors.append(UploadErrorResponse(file=f.filename or "", error=str(e)))

        if not uploaded and errors:
            raise UploadFailedError(errors=errors)

        return UploadResponse(uploaded=uploaded, errors=errors)

    def delete_document(self, doc_id: int, user_id: int) -> MessageResponse:
        lib = self.repo.get_by_id(doc_id, user_id)
        if not lib:
            raise NotFoundError("Document not found")
        if lib.path:
            self.storage.delete_file(lib.path)
        self.repo.delete(lib)
        return MessageResponse(message="Document deleted")

    def clear_all(self, user_id: int) -> MessageResponse:
        for lib in self.repo.get_all(user_id):
            try:
                if lib.path:
                    self.storage.delete_file(lib.path)
            except Exception:
                _log.warning("Failed to delete file %s", lib.path, exc_info=True)
        self.repo.clear_user_library(user_id)
        return MessageResponse(message="Library cleared")
