from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from src.core.dependencies import get_current_user, get_current_user_id
from src.core.jobs import process_document_job
from src.models.user import User
from src.schemas.library import CreateUploadsRequest, CreateUploadsResponse, LibraryDocResponse
from src.services.library_service import LibraryService, LibraryServiceProtocol

router = APIRouter(prefix="/library", tags=["Library"])


@router.get("")
def fetch_library(
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
):
    return service.get_library_data(user_id)


@router.post("/upload")
async def upload_library(
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    service: LibraryServiceProtocol = Depends(LibraryService),
):
    return await service.save_files(user.id, user.plan, files)


@router.post("/uploads")
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
) -> LibraryDocResponse:
    doc, started = service.complete_upload(user_id, doc_id)
    if started:
        background.add_task(process_document_job, doc_id)
    return doc


@router.post("/{doc_id}/retry")
def retry_processing(
    doc_id: int,
    background: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
    service: LibraryServiceProtocol = Depends(LibraryService),
) -> LibraryDocResponse:
    doc, started = service.retry_processing(user_id, doc_id)
    if started:
        background.add_task(process_document_job, doc_id)
    return doc


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
