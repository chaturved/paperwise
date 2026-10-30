from enum import StrEnum


class DocumentStatus(StrEnum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Plan(StrEnum):
    FREE = "free"
    PRO = "pro"
