from datetime import datetime
from typing import Protocol

from fastapi import Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.models.conversation import Conversation
from src.models.message import Message


class ConversationRepositoryProtocol(Protocol):
    def create(
        self, user_id: int, title: str = "New conversation", created_at: datetime | None = None
    ) -> Conversation: ...
    def get_all(self, user_id: int) -> list[Conversation]: ...
    def search(self, user_id: int, query: str, limit: int = 25) -> list[tuple[Conversation, str | None]]: ...
    def get_by_id(self, conv_id: int, user_id: int) -> Conversation | None: ...
    def update_title(self, conv: Conversation, title: str) -> Conversation: ...
    def touch(self, conv: Conversation) -> None: ...
    def delete(self, conv: Conversation) -> None: ...
    def add_message(
        self, conversation_id: int, role: str, content: str, meta: dict | None = None, parent_id: int | None = None
    ) -> Message: ...
    def get_messages(self, conversation_id: int) -> list[Message]: ...
    def set_active_leaf(self, conv: Conversation, message_id: int | None) -> None: ...


class ConversationRepository(ConversationRepositoryProtocol):
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db

    def create(self, user_id: int, title: str = "New conversation", created_at: datetime | None = None) -> Conversation:
        conv = Conversation(user_id=user_id, title=title, created_at=created_at)
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def get_all(self, user_id: int) -> list[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .all()
        )

    def search(self, user_id: int, query: str, limit: int = 25) -> list[tuple[Conversation, str | None]]:
        escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        matching_message = (
            select(Message.content)
            .where(Message.conversation_id == Conversation.id, Message.content.ilike(pattern, escape="\\"))
            .order_by(Message.created_at.desc(), Message.id.desc())
            .limit(1)
            .scalar_subquery()
        )
        return (
            self.db.query(Conversation, matching_message.label("match_content"))
            .filter(Conversation.user_id == user_id)
            .filter(or_(Conversation.title.ilike(pattern, escape="\\"), matching_message.is_not(None)))
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .all()
        )

    def get_by_id(self, conv_id: int, user_id: int) -> Conversation | None:
        return self.db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == user_id).first()

    def update_title(self, conv: Conversation, title: str) -> Conversation:
        conv.title = title
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def touch(self, conv: Conversation) -> None:
        conv.updated_at = func.now()
        self.db.commit()

    def delete(self, conv: Conversation) -> None:
        self.db.delete(conv)
        self.db.commit()

    def add_message(
        self, conversation_id: int, role: str, content: str, meta: dict | None = None, parent_id: int | None = None
    ) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content, meta=meta, parent_id=parent_id)
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_messages(self, conversation_id: int) -> list[Message]:
        return (
            self.db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.id.asc()).all()
        )

    def set_active_leaf(self, conv: Conversation, message_id: int | None) -> None:
        conv.active_leaf_id = message_id
        self.db.commit()
