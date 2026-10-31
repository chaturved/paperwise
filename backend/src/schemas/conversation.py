from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

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
    version: int = 1
    versions: int = 1
    sibling_ids: list[int] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class FollowUpsResponse(BaseModel):
    questions: list[str]


class AskFilters(BaseModel):
    doc_id: int | None = None
    doc_ids: list[int] | None = Field(default=None, max_length=20)


class AskRequest(BaseModel):
    question: str
    filters: AskFilters | None = None
    top_k: int = 5
    edit_of: int | None = None
    retry_of: int | None = None

    @model_validator(mode="after")
    def _one_change_at_a_time(self) -> "AskRequest":
        if self.edit_of is not None and self.retry_of is not None:
            raise ValueError("A request can edit a question or retry an answer, not both")
        return self


class MessageRef(BaseModel):
    message_id: int
