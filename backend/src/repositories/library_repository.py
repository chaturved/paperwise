from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends
from sqlalchemy import exists, func
from sqlalchemy.orm import Session

from src.core.enums import DocumentStatus
from src.database.db import get_db
from src.models import Library, LibraryChunk


def _now() -> datetime:
    return datetime.now(UTC)


class LibraryRepositoryProtocol(Protocol):
    def get_all(self, user_id: int) -> list[Library]: ...
    def count_active(self, user_id: int) -> int: ...
    def page_counts(self, user_id: int) -> dict[int, int]: ...
    def get(self, doc_id: int) -> Library | None: ...
    def get_by_id(self, doc_id: int, user_id: int) -> Library | None: ...
    def get_by_content_hash(self, user_id: int, content_hash: str) -> Library | None: ...
    def add(self, library: Library) -> Library: ...
    def add_chunks(self, chunks: list[LibraryChunk]) -> None: ...
    def transition_status(self, doc_id: int, from_status: DocumentStatus, to_status: DocumentStatus) -> bool: ...
    def set_status(self, lib: Library, status: DocumentStatus, error_message: str | None = None) -> None: ...
    def finish_processing(self, lib: Library, text: str, content_hash: str, chunks: list[LibraryChunk]) -> None: ...
    def list_missing_page_numbers(self) -> list[Library]: ...
    def list_passages(self, library_id: int) -> list[tuple[str, int | None]]: ...
    def set_key_dates(self, lib: Library, key_dates: list[dict]) -> None: ...
    def rollback(self) -> None: ...
    def list_stale(self, statuses: list[DocumentStatus], cutoff: datetime) -> list[Library]: ...
    def get_chunks_after(self, chunk_id: int, limit: int) -> list[LibraryChunk]: ...
    def set_embeddings(self, chunks: list[LibraryChunk], embeddings: list[list[float]]) -> None: ...
    def delete(self, lib: Library) -> None: ...
    def clear_user_library(self, user_id: int) -> None: ...
    def get_top_k_chunks(
        self,
        user_id: int,
        query_vector: list[float],
        top_k: int,
        doc_ids: list[int] | None,
    ) -> list: ...


class LibraryRepository(LibraryRepositoryProtocol):
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db

    def get_all(self, user_id: int) -> list[Library]:
        return self.db.query(Library).filter(Library.user_id == user_id).all()

    def count_active(self, user_id: int) -> int:
        """Documents that use up the plan limit: everything except ones that failed."""
        return (
            self.db.query(func.count(Library.id))
            .filter(Library.user_id == user_id, Library.status != DocumentStatus.FAILED)
            .scalar()
            or 0
        )

    def page_counts(self, user_id: int) -> dict[int, int]:
        """The highest page number stored for each of the user's documents that has pages."""
        rows = (
            self.db.query(LibraryChunk.library_id, func.max(LibraryChunk.page_number))
            .join(Library, Library.id == LibraryChunk.library_id)
            .filter(Library.user_id == user_id, LibraryChunk.page_number.isnot(None))
            .group_by(LibraryChunk.library_id)
            .all()
        )
        return {library_id: pages for library_id, pages in rows}

    def get(self, doc_id: int) -> Library | None:
        return self.db.get(Library, doc_id)

    def get_by_id(self, doc_id: int, user_id: int) -> Library | None:
        return self.db.query(Library).filter(Library.id == doc_id, Library.user_id == user_id).first()

    def get_by_content_hash(self, user_id: int, content_hash: str) -> Library | None:
        return self.db.query(Library).filter(Library.user_id == user_id, Library.content_hash == content_hash).first()

    def add(self, library: Library) -> Library:
        self.db.add(library)
        self.db.commit()
        self.db.refresh(library)
        return library

    def add_chunks(self, chunks: list[LibraryChunk]) -> None:
        self.db.add_all(chunks)
        self.db.commit()

    def transition_status(self, doc_id: int, from_status: DocumentStatus, to_status: DocumentStatus) -> bool:
        """Move a document to a new status only if it is still in the expected one. True if this call won."""
        updated = (
            self.db.query(Library)
            .filter(Library.id == doc_id, Library.status == from_status)
            .update(
                {Library.status: to_status, Library.error_message: None, Library.status_updated_at: _now()},
                synchronize_session=False,
            )
        )
        self.db.commit()
        return updated == 1

    def set_status(self, lib: Library, status: DocumentStatus, error_message: str | None = None) -> None:
        lib.status = status
        lib.error_message = error_message
        lib.status_updated_at = _now()
        self.db.commit()

    def finish_processing(self, lib: Library, text: str, content_hash: str, chunks: list[LibraryChunk]) -> None:
        """Save the extracted text, the chunks and the 'ready' status in a single transaction.

        Chunks from an earlier run are replaced in the same transaction, so a failure never leaves a document
        with no chunks.
        """
        lib.extracted_text = text
        lib.content_hash = content_hash
        lib.status = DocumentStatus.READY
        lib.error_message = None
        lib.status_updated_at = _now()
        self.db.query(LibraryChunk).filter(LibraryChunk.library_id == lib.id).delete(synchronize_session=False)
        self.db.add_all(chunks)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()

    def list_passages(self, library_id: int) -> list[tuple[str, int | None]]:
        """The text and page of every chunk of a document, in reading order, without the embeddings."""
        rows = (
            self.db.query(LibraryChunk.chunk_text, LibraryChunk.page_number)
            .filter(LibraryChunk.library_id == library_id)
            .order_by(LibraryChunk.chunk_index)
            .all()
        )
        return [(text, page) for text, page in rows]

    def set_key_dates(self, lib: Library, key_dates: list[dict]) -> None:
        lib.key_dates = key_dates
        self.db.commit()

    def list_missing_page_numbers(self) -> list[Library]:
        """Ready PDFs that were indexed before chunks recorded their page."""
        unpaged = exists().where(LibraryChunk.library_id == Library.id, LibraryChunk.page_number.is_(None))
        return (
            self.db.query(Library)
            .filter(Library.status == DocumentStatus.READY, Library.type == "pdf", unpaged)
            .order_by(Library.id)
            .all()
        )

    def list_stale(self, statuses: list[DocumentStatus], cutoff: datetime) -> list[Library]:
        last_change = func.coalesce(Library.status_updated_at, Library.created_at)
        return self.db.query(Library).filter(Library.status.in_(statuses), last_change < cutoff).all()

    def get_chunks_after(self, chunk_id: int, limit: int) -> list[LibraryChunk]:
        return (
            self.db.query(LibraryChunk).filter(LibraryChunk.id > chunk_id).order_by(LibraryChunk.id).limit(limit).all()
        )

    def set_embeddings(self, chunks: list[LibraryChunk], embeddings: list[list[float]]) -> None:
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
        self.db.commit()

    def delete(self, lib: Library) -> None:
        self.db.delete(lib)
        self.db.commit()

    def clear_user_library(self, user_id: int) -> None:
        libraries = self.db.query(Library).filter(Library.user_id == user_id).all()
        library_ids = [lib.id for lib in libraries]
        self.db.query(LibraryChunk).filter(LibraryChunk.library_id.in_(library_ids)).delete(synchronize_session=False)
        self.db.query(Library).filter(Library.user_id == user_id).delete(synchronize_session=False)
        self.db.commit()

    def get_top_k_chunks(
        self,
        user_id: int,
        query_vector: list[float],
        top_k: int = 5,
        doc_ids: list[int] | None = None,
    ) -> list:
        q = (
            self.db.query(LibraryChunk, Library)
            .join(Library, LibraryChunk.library_id == Library.id)
            .filter(Library.user_id == user_id)
        )
        if doc_ids:
            q = q.filter(Library.id.in_(doc_ids))
        return q.order_by(LibraryChunk.embedding.cosine_distance(query_vector)).limit(top_k).all()
