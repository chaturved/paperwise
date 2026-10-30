from fastapi import APIRouter, Depends, File, UploadFile

from src.core.dependencies import get_current_user, get_current_user_id
from src.models.user import User
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
