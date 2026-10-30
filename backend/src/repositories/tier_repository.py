from datetime import UTC, datetime, timedelta
from typing import Protocol

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.models.query_usage_log import QueryUsageLog


class TierRepositoryProtocol(Protocol):
    def count_queries_24h(self, user_id: int) -> int: ...
    def log_query(self, user_id: int) -> int: ...
    def remove_query(self, log_id: int) -> None: ...


class TierRepository(TierRepositoryProtocol):
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db

    def count_queries_24h(self, user_id: int) -> int:
        cutoff = datetime.now(UTC) - timedelta(hours=24)
        stmt = (
            select(func.count())
            .select_from(QueryUsageLog)
            .where(
                QueryUsageLog.user_id == user_id,
                QueryUsageLog.created_at >= cutoff,
            )
        )
        return self.db.scalar(stmt) or 0

    def log_query(self, user_id: int) -> int:
        log = QueryUsageLog(user_id=user_id)
        self.db.add(log)
        self.db.commit()
        return log.id

    def remove_query(self, log_id: int) -> None:
        self.db.query(QueryUsageLog).filter(QueryUsageLog.id == log_id).delete()
        self.db.commit()
