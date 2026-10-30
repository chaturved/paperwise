from datetime import UTC, datetime, timedelta
from typing import Protocol

from fastapi import Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.models import Library, MessageFeedback, QueryUsageLog
from src.models.library_chunk import LibraryChunk


class AnalyticsRepositoryProtocol(Protocol):
    def get_overview(self, user_id: int) -> dict: ...
    def get_query_volume(self, user_id: int, days: int) -> list[dict]: ...
    def get_top_cited_docs(self, user_id: int, limit: int = 10) -> list[dict]: ...
    def upsert_feedback(self, message_id: int, user_id: int, value: str) -> MessageFeedback: ...
    def get_user_feedbacks(self, user_id: int, message_ids: list[int]) -> dict[int, str]: ...


class AnalyticsRepository(AnalyticsRepositoryProtocol):
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db

    def get_overview(self, user_id: int) -> dict:
        total_queries = self.count_questions(user_id)
        total_docs = self.db.query(func.count(Library.id)).filter(Library.user_id == user_id).scalar() or 0
        total_chunks = (
            self.db.query(func.count(LibraryChunk.id))
            .join(Library, LibraryChunk.library_id == Library.id)
            .filter(Library.user_id == user_id)
            .scalar() or 0
        )

        feedback_rows = (
            self.db.query(MessageFeedback.value, func.count(MessageFeedback.id))
            .filter(MessageFeedback.user_id == user_id)
            .group_by(MessageFeedback.value)
            .all()
        )
        feedback = {row[0]: row[1] for row in feedback_rows}
        thumbs_up = feedback.get("up", 0)
        thumbs_down = feedback.get("down", 0)
        total_feedback = thumbs_up + thumbs_down
        quality_pct = round(thumbs_up / total_feedback * 100) if total_feedback > 0 else None

        queries_30d = self.count_questions(user_id, since=datetime.now(UTC) - timedelta(days=30))

        return {
            "total_queries": total_queries,
            "total_docs": total_docs,
            "total_chunks": total_chunks,
            "quality_pct": quality_pct,
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
            "queries_last_30d": queries_30d,
        }

    def count_questions(self, user_id: int, since: datetime | None = None) -> int:
        """Questions asked in chat. Every ask is logged to QueryUsageLog, which also enforces the daily limit."""
        conditions = [QueryUsageLog.user_id == user_id]
        if since is not None:
            conditions.append(QueryUsageLog.created_at >= since)
        return self.db.query(func.count(QueryUsageLog.id)).filter(*conditions).scalar() or 0

    def get_query_volume(self, user_id: int, days: int = 30) -> list[dict]:
        since = datetime.now(UTC) - timedelta(days=days)
        rows = (
            self.db.query(func.date(QueryUsageLog.created_at).label("day"), func.count(QueryUsageLog.id).label("count"))
            .filter(QueryUsageLog.user_id == user_id, QueryUsageLog.created_at >= since)
            .group_by(func.date(QueryUsageLog.created_at))
            .order_by(func.date(QueryUsageLog.created_at))
            .all()
        )
        return [{"date": str(row.day), "count": row.count} for row in rows]

    def get_top_cited_docs(self, user_id: int, limit: int = 10) -> list[dict]:
        rows = self.db.execute(
            text("""
                SELECT source->>'name' AS doc_name, COUNT(DISTINCT m.id) AS citation_count
                FROM messages m
                JOIN conversations c ON c.id = m.conversation_id
                CROSS JOIN jsonb_array_elements(m.meta->'sources') AS source
                WHERE c.user_id = :user_id
                  AND m.role = 'assistant'
                  AND m.meta IS NOT NULL
                GROUP BY source->>'name'
                ORDER BY citation_count DESC
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": limit},
        ).fetchall()
        return [{"name": row.doc_name, "citations": row.citation_count} for row in rows]

    def upsert_feedback(self, message_id: int, user_id: int, value: str) -> MessageFeedback:
        existing = (
            self.db.query(MessageFeedback)
            .filter(MessageFeedback.message_id == message_id, MessageFeedback.user_id == user_id)
            .first()
        )
        if existing:
            existing.value = value
            self.db.commit()
            self.db.refresh(existing)
            return existing
        feedback = MessageFeedback(message_id=message_id, user_id=user_id, value=value)
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

    def get_user_feedbacks(self, user_id: int, message_ids: list[int]) -> dict[int, str]:
        if not message_ids:
            return {}
        rows = (
            self.db.query(MessageFeedback.message_id, MessageFeedback.value)
            .filter(MessageFeedback.user_id == user_id, MessageFeedback.message_id.in_(message_ids))
            .all()
        )
        return {row.message_id: row.value for row in rows}
