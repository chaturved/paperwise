from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.enums import DocumentStatus
from ..database.db import Base

if TYPE_CHECKING:
    from .library_chunk import LibraryChunk
    from .user import User


class Library(Base):
    __tablename__ = "libraries"
    __table_args__ = (UniqueConstraint("user_id", "content_hash", name="uq_libraries_user_content_hash"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    status: Mapped[str] = mapped_column(
        String(20), default=DocumentStatus.READY, server_default=DocumentStatus.READY.value
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    chunks: Mapped[list[LibraryChunk]] = relationship("LibraryChunk", back_populates="library", cascade="all, delete-orphan")
    user: Mapped[User] = relationship("User", back_populates="libraries")
