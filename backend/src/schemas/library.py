from datetime import datetime

from pydantic import BaseModel, Field


class LibraryDocResponse(BaseModel):
    id: int
    name: str
    type: str
    size: int
    created_at: datetime
    status: str
    error_message: str | None = None

    model_config = {"from_attributes": True}


class LibraryResponse(BaseModel):
    count: int
    total_size_bytes: int
    sections: list[LibraryDocResponse]


class UploadFileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)


class CreateUploadsRequest(BaseModel):
    files: list[UploadFileRequest] = Field(min_length=1, max_length=20)


class UploadSlotResponse(BaseModel):
    id: int
    name: str
    upload_url: str
    headers: dict[str, str]  # the browser must send exactly these headers with its PUT


class CreateUploadsResponse(BaseModel):
    uploads: list[UploadSlotResponse]
