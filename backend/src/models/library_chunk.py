from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..config import settings
from ..database.db import Base

if TYPE_CHECKING:
    from .library import Library

try:
    from pgvector.sqlalchemy import Vector

    _EMBEDDING_COL = Vector(settings.EMBEDDING_DIMENSIONS)
except ImportError:
    from sqlalchemy import Text as _Text

    _EMBEDDING_COL = _Text()


class LibraryChunk(Base):
    __tablename__ = "library_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    library_id: Mapped[int] = mapped_column(ForeignKey("libraries.id"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    chunk_text: Mapped[str] = mapped_column(Text)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scanned: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    embedding = mapped_column(_EMBEDDING_COL, nullable=True)

    library: Mapped[Library] = relationship("Library", back_populates="chunks")
