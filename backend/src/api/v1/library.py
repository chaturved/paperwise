from fastapi import APIRouter, BackgroundTasks, Depends

from src.core.dependencies import get_current_user, get_current_user_id
from src.core.jobs import DocumentJobs
from src.core.rate_limit import UserRateLimit
from src.models.user import User
from src.schemas.library import (
    CreateUploadsRequest,
    CreateUploadsResponse,
    DocumentFileResponse,
    LibraryDocResponse,
)
from src.services.library_service import LibraryService, LibraryServiceProtocol

router = APIRouter(prefix="/library", tags=["Library"])

upload_limit = UserRateLimit("upload", "20/minute")


@router.get("")
def fetch_library(
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
):
    return service.get_library_data(user_id)


@router.post("/uploads", dependencies=[Depends(upload_limit)])
def create_uploads(
    body: CreateUploadsRequest,
    user: User = Depends(get_current_user),
    service: LibraryServiceProtocol = Depends(LibraryService),
) -> CreateUploadsResponse:
    return service.create_uploads(user.id, user.plan, body)


@router.post("/{doc_id}/complete")
def complete_upload(
    doc_id: int,
    background: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
    jobs: DocumentJobs = Depends(DocumentJobs),
) -> LibraryDocResponse:
    doc, started = service.complete_upload(user_id, doc_id)
    if started:
        background.add_task(jobs.process, doc_id)
    return doc


@router.post("/{doc_id}/retry", dependencies=[Depends(upload_limit)])
def retry_processing(
    doc_id: int,
    background: BackgroundTasks,
    user: User = Depends(get_current_user),
    service: LibraryServiceProtocol = Depends(LibraryService),
    jobs: DocumentJobs = Depends(DocumentJobs),
) -> LibraryDocResponse:
    doc, started = service.retry_processing(user.id, user.plan, doc_id)
    if started:
        background.add_task(jobs.process, doc_id)
    return doc


@router.get("/{doc_id}/file")
def document_file(
    doc_id: int,
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
) -> DocumentFileResponse:
    return service.get_file_url(user_id, doc_id)


@router.delete("/clear")
def clear_library(
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
):
    return service.clear_all(user_id)


@router.delete("/{doc_id}")
def delete_doc(
    doc_id: int,
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
):
    return service.delete_document(doc_id, user_id)
