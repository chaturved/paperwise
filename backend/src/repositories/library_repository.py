from typing import Optional, Protocol

from fastapi import Depends
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.models import Library, LibraryChunk


class LibraryRepositoryProtocol(Protocol):
    def get_all(self, user_id: int) -> list[Library]: ...
    def get_by_id(self, doc_id: int, user_id: int) -> Optional[Library]: ...
    def get_by_content_hash(self, user_id: int, content_hash: str) -> Optional[Library]: ...
    def add(self, library: Library) -> Library: ...
    def add_chunks(self, chunks: list[LibraryChunk]) -> None: ...
    def get_chunks_after(self, chunk_id: int, limit: int) -> list[LibraryChunk]: ...
    def set_embeddings(self, chunks: list[LibraryChunk], embeddings: list[list[float]]) -> None: ...
    def delete(self, lib: Library) -> None: ...
    def clear_user_library(self, user_id: int) -> None: ...
    def get_top_k_chunks(
        self,
        user_id: int,
        query_vector: list[float],
        top_k: int,
        doc_id: Optional[int],
    ) -> list: ...


class LibraryRepository(LibraryRepositoryProtocol):
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db

    def get_all(self, user_id: int) -> list[Library]:
        return self.db.query(Library).filter(Library.user_id == user_id).all()

    def get_by_id(self, doc_id: int, user_id: int) -> Optional[Library]:
        return self.db.query(Library).filter(Library.id == doc_id, Library.user_id == user_id).first()

    def get_by_content_hash(self, user_id: int, content_hash: str) -> Optional[Library]:
        return self.db.query(Library).filter(Library.user_id == user_id, Library.content_hash == content_hash).first()

    def add(self, library: Library) -> Library:
        self.db.add(library)
        self.db.commit()
        self.db.refresh(library)
        return library

    def add_chunks(self, chunks: list[LibraryChunk]) -> None:
        self.db.add_all(chunks)
        self.db.commit()

    def get_chunks_after(self, chunk_id: int, limit: int) -> list[LibraryChunk]:
        return (
            self.db.query(LibraryChunk)
            .filter(LibraryChunk.id > chunk_id)
            .order_by(LibraryChunk.id)
            .limit(limit)
            .all()
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
        doc_id: Optional[int] = None,
    ) -> list:
        q = (
            self.db.query(LibraryChunk, Library)
            .join(Library, LibraryChunk.library_id == Library.id)
            .filter(Library.user_id == user_id)
        )
        if doc_id:
            q = q.filter(Library.id == doc_id)
        return q.order_by(LibraryChunk.embedding.cosine_distance(query_vector)).limit(top_k).all()
