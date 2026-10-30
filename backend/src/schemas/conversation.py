from datetime import datetime
from typing import Any

from pydantic import BaseModel

DEFAULT_CONVERSATION_TITLE = "New conversation"


class ConversationCreate(BaseModel):
    title: str = DEFAULT_CONVERSATION_TITLE


class ConversationRename(BaseModel):
    title: str


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationSearchResult(ConversationOut):
    match_excerpt: str | None = None


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    meta: Any = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AskFilters(BaseModel):
    doc_id: int | None = None


class AskRequest(BaseModel):
    question: str
    filters: AskFilters | None = None
    top_k: int = 5
    use_documents: bool = True
