from datetime import date as CalendarDate
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
    pages: int | None = None

    model_config = {"from_attributes": True}


class KeyDate(BaseModel):
    label: str
    date: CalendarDate | None = None
    timing: str | None = None
    quote: str
    page: int | None = None
    year_assumed: bool = False


class KeyDatesResponse(BaseModel):
    dates: list[KeyDate]


class LibraryResponse(BaseModel):
    count: int
    total_size_bytes: int
    sections: list[LibraryDocResponse]


class UploadFileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)


class DocumentFileResponse(BaseModel):
    url: str
    expires_in: int


class CreateUploadsRequest(BaseModel):
    files: list[UploadFileRequest] = Field(min_length=1, max_length=20)


class UploadSlotResponse(BaseModel):
    id: int
    name: str
    upload_url: str
    headers: dict[str, str]  # the browser must send exactly these headers with its PUT


class CreateUploadsResponse(BaseModel):
    uploads: list[UploadSlotResponse]
