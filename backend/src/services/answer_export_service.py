from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends

from src.core.enums import Plan
from src.core.exceptions import BadRequestError, NotFoundError
from src.repositories.conversation_repository import ConversationRepository, ConversationRepositoryProtocol
from src.services.tier_service import TierService, TierServiceProtocol
from src.utils.answer_docx import AnswerDocxWriter
from src.utils.message_tree import MessageTree

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@dataclass(frozen=True)
class ExportedFile:
    filename: str
    content: bytes
    media_type: str


class AnswerExportServiceProtocol(Protocol):
    def export_docx(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> ExportedFile: ...


class AnswerExportService(AnswerExportServiceProtocol):
    def __init__(
        self,
        conv_repo: ConversationRepositoryProtocol = Depends(ConversationRepository),
        tier: TierServiceProtocol = Depends(TierService),
        writer: AnswerDocxWriter = Depends(AnswerDocxWriter),
    ):
        self.conv_repo = conv_repo
        self.tier = tier
        self.writer = writer

    def export_docx(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> ExportedFile:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))

        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        answer = tree.require(message_id, "assistant")
        if (answer.meta or {}).get("failed"):
            raise BadRequestError("An answer that failed can't be exported")
        question = tree.parent_of(answer)
        sources = (answer.meta or {}).get("sources", [])
        content = self.writer.write(question.content if question else None, answer.content, sources)
        return ExportedFile("paperwise-answer.docx", content, DOCX_MEDIA_TYPE)
