"""Work that runs after a response has been sent, or at startup, with its own database session."""

from collections.abc import Callable

from sqlalchemy.orm import Session

from src.config import settings
from src.database.db import SessionLocal
from src.integrations.ai import get_ai_provider
from src.integrations.documents import IsolatedExtractor, ReadableTextExtractor
from src.integrations.storage import S3Storage
from src.repositories.library_repository import LibraryRepository
from src.services.ingestion_service import IngestionService
from src.utils.concurrency import PerLoopSemaphore
from src.utils.text_utils import TextChunker


class DocumentJobs:
    """At most INGEST_MAX_CONCURRENCY documents are processed at once per server process, shared by every instance."""

    _ingest_slots = PerLoopSemaphore(lambda: settings.INGEST_MAX_CONCURRENCY)

    def __init__(self, session_factory: Callable[[], Session] = SessionLocal) -> None:
        self.session_factory = session_factory

    async def process(self, doc_id: int) -> None:
        async with self._ingest_slots.get():
            with self.session_factory() as db:
                await self.ingestion_service(db).process(doc_id)

    def recover_interrupted(self) -> None:
        with self.session_factory() as db:
            self.ingestion_service(db).recover_interrupted()

    def ingestion_service(self, db: Session) -> IngestionService:
        chunker = TextChunker()
        return IngestionService(
            repo=LibraryRepository(db),
            storage=S3Storage(),
            ai=get_ai_provider(),
            reader=ReadableTextExtractor(extractor=IsolatedExtractor(), chunker=chunker),
            chunker=chunker,
        )
