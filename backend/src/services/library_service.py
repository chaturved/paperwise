import hashlib
import logging
import mimetypes
import os
from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends, UploadFile

from src.core.enums import DocumentStatus, Plan
from src.core.exceptions import BadRequestError, ConflictError, NotFoundError, UploadFailedError
from src.models import Library, LibraryChunk
from src.repositories.library_repository import LibraryRepository, LibraryRepositoryProtocol
from src.schemas.library import (
    CreateUploadsRequest,
    CreateUploadsResponse,
    LibraryDocResponse,
    LibraryResponse,
    UploadErrorResponse,
    UploadItemResponse,
    UploadResponse,
    UploadSlotResponse,
)
from src.schemas.user import MessageResponse
from src.services.tier_service import TierService, TierServiceProtocol, UploadMeta
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
from src.integrations.documents import extract_readable_text
from src.integrations.storage import S3Storage
from src.utils.text_utils import chunk_text

_log = logging.getLogger(__name__)


class LibraryServiceProtocol(Protocol):
    def get_library_data(self, user_id: int) -> LibraryResponse: ...
    async def save_files(self, user_id: int, plan: Plan, files: list[UploadFile]) -> UploadResponse: ...
    def create_uploads(self, user_id: int, plan: Plan, request: CreateUploadsRequest) -> CreateUploadsResponse: ...
    def complete_upload(self, user_id: int, doc_id: int) -> tuple[LibraryDocResponse, bool]: ...
    def retry_processing(self, user_id: int, doc_id: int) -> tuple[LibraryDocResponse, bool]: ...
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
                uploaded.append(await self._ingest(user_id, f))
            except Exception as e:
                _log.exception("Failed to process upload %s", f.filename)
                errors.append(UploadErrorResponse(file=f.filename or "", error=str(e)))

        if not uploaded and errors:
            raise UploadFailedError(errors=errors)

        return UploadResponse(uploaded=uploaded, errors=errors)

    async def _ingest(self, user_id: int, f: UploadFile) -> UploadItemResponse:
        """Read one uploaded file, extract and embed its text, then store the file and its chunks."""
        raw = await f.read()
        content_hash = self._reject_duplicate(user_id, raw)
        f.file.seek(0)

        ext = (f.filename or "").split(".")[-1].lower()
        text = await extract_readable_text(raw, ext)

        file_url, contents = await self.storage.save_raw_file(f, user_id)
        chunks = chunk_text(text)
        embeddings = await self.ai.get_embeddings(chunks)

        library = self.repo.add(
            Library(
                user_id=user_id,
                name=f.filename,
                type=ext,
                size=len(contents),
                path=file_url,
                extracted_text=text,
                content_hash=content_hash,
            )
        )
        self.repo.add_chunks(
            [
                LibraryChunk(library_id=library.id, chunk_index=i, chunk_text=chunk, embedding=embedding)
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
            ]
        )
        f.file.seek(0)
        return UploadItemResponse.model_validate(library)

    def _reject_duplicate(self, user_id: int, raw: bytes) -> str:
        content_hash = hashlib.sha256(raw).hexdigest()
        if self.repo.get_by_content_hash(user_id, content_hash):
            raise ConflictError("This file has already been uploaded")
        return content_hash

    def create_uploads(self, user_id: int, plan: Plan, request: CreateUploadsRequest) -> CreateUploadsResponse:
        """Reserve a library entry for each file and hand back a signed URL the browser uploads it to."""
        metadata = [UploadMeta(f.name, f.size) for f in request.files]
        self.tier.check_upload_metadata(plan, metadata, self.repo.count_active(user_id))

        slots: list[UploadSlotResponse] = []
        for f in request.files:
            name = os.path.basename(f.name)
            key = self.storage.key_for(user_id, name)
            content_type = f.content_type or mimetypes.guess_type(name)[0] or "application/octet-stream"
            library = self.repo.add(
                Library(
                    user_id=user_id,
                    name=name,
                    type=name.rsplit(".", 1)[-1].lower(),
                    size=f.size,
                    path=self.storage.public_url(key),
                    status=DocumentStatus.UPLOADING,
                    status_updated_at=datetime.now(UTC),
                )
            )
            upload_url = self.storage.create_upload_url(key, f.size, content_type)
            slots.append(
                UploadSlotResponse(id=library.id, name=name, upload_url=upload_url, headers={"Content-Type": content_type})
            )
        return CreateUploadsResponse(uploads=slots)

    def complete_upload(self, user_id: int, doc_id: int) -> tuple[LibraryDocResponse, bool]:
        """Confirm the browser finished uploading. Returns the document and whether processing should start."""
        lib = self._get_owned(user_id, doc_id)
        if lib.status != DocumentStatus.UPLOADING:  # a repeated call: nothing more to schedule
            return LibraryDocResponse.model_validate(lib), False

        stored_size = self.storage.object_size(self.storage.key_from_path(lib.path or ""))
        if stored_size is None:
            raise BadRequestError("We didn't receive this file. Please upload it again.")
        if stored_size != lib.size:
            self._discard(lib, "The uploaded file didn't match its expected size. Please upload it again.")
            raise BadRequestError("The uploaded file didn't match its expected size. Please upload it again.")

        started = self.repo.transition_status(lib.id, DocumentStatus.UPLOADING, DocumentStatus.PROCESSING)
        return LibraryDocResponse.model_validate(lib), started

    def retry_processing(self, user_id: int, doc_id: int) -> tuple[LibraryDocResponse, bool]:
        lib = self._get_owned(user_id, doc_id)
        if lib.status != DocumentStatus.FAILED:
            raise ConflictError("Only documents that failed can be retried")
        if self.storage.object_size(self.storage.key_from_path(lib.path or "")) is None:
            raise BadRequestError("The original file is no longer available. Please upload it again.")

        started = self.repo.transition_status(lib.id, DocumentStatus.FAILED, DocumentStatus.PROCESSING)
        return LibraryDocResponse.model_validate(lib), started

    def _get_owned(self, user_id: int, doc_id: int) -> Library:
        lib = self.repo.get_by_id(doc_id, user_id)
        if not lib:
            raise NotFoundError("Document not found")
        return lib

    def _discard(self, lib: Library, message: str) -> None:
        if lib.path:
            self.storage.delete_file(lib.path)
        self.repo.set_status(lib, DocumentStatus.FAILED, message)

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
