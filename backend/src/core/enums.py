from enum import StrEnum


class DocumentStatus(StrEnum):
    UPLOADING = "uploading"  # the row exists and the browser is sending the file to storage
    PROCESSING = "processing"  # the file is stored; text is being extracted, embedded and indexed
    READY = "ready"
    FAILED = "failed"


class Plan(StrEnum):
    FREE = "free"
    PRO = "pro"
