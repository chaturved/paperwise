from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.db import Base

if TYPE_CHECKING:
    from .user import User


class QueryUsageLog(Base):
    __tablename__ = "query_usage_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship("User", back_populates="query_usage_logs")
