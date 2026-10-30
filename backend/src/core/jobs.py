"""Work that runs after a response has been sent, or at startup, with its own database session."""

from src.config import settings
from src.database.db import SessionLocal
from src.integrations.ai import get_ai_provider
from src.integrations.storage import S3Storage
from src.repositories.library_repository import LibraryRepository
from src.services.ingestion_service import IngestionService
from src.utils.concurrency import PerLoopSemaphore

_ingest_slots = PerLoopSemaphore(lambda: settings.INGEST_MAX_CONCURRENCY)


def _ingestion_service(db) -> IngestionService:
    return IngestionService(repo=LibraryRepository(db), storage=S3Storage(), ai=get_ai_provider())


async def process_document_job(doc_id: int) -> None:
    """Index one uploaded document. At most INGEST_MAX_CONCURRENCY run at once per server process."""
    async with _ingest_slots.get():
        with SessionLocal() as db:
            await _ingestion_service(db).process(doc_id)


def recover_interrupted_documents() -> None:
    with SessionLocal() as db:
        _ingestion_service(db).recover_interrupted()
