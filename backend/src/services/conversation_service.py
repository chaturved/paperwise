from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends

from src.core.enums import Plan
from src.core.exceptions import NotFoundError
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
from src.models import Conversation
from src.repositories.conversation_repository import (
    ConversationRepository,
    ConversationRepositoryProtocol,
)
from src.repositories.library_repository import (
    LibraryRepository,
    LibraryRepositoryProtocol,
)
from src.schemas.conversation import (
    DEFAULT_CONVERSATION_TITLE,
    AskFilters,
    ConversationOut,
    ConversationSearchResult,
    MessageOut,
)
from src.schemas.user import MessageResponse
from src.services.answer_generator import NOT_FOUND_MESSAGE, AnswerGenerator, AnswerGeneratorProtocol
from src.services.tier_service import TierService, TierServiceProtocol
from src.utils.chunk_formatter import ChunkFormatter
from src.utils.citations import CitationExtractor

GENERAL_HISTORY_MESSAGES = 10
GENERAL_DESCRIPTION = "A general answer. It is not based on your documents, so there are no sources to check."
GENERAL_BADGES = [
    {"label": "AI generated", "icon": "bot"},
    {"label": "Not from your documents", "icon": "warning"},
]


class ConversationServiceProtocol(Protocol):
    def list_conversations(self, user_id: int) -> list[ConversationOut]: ...
    def search_conversations(self, user_id: int, query: str) -> list[ConversationSearchResult]: ...
    def new_conversation(self, user_id: int, title: str) -> ConversationOut: ...
    def rename_conversation(self, conv_id: int, user_id: int, title: str) -> ConversationOut: ...
    def remove_conversation(self, conv_id: int, user_id: int) -> MessageResponse: ...
    def list_messages(self, conv_id: int, user_id: int, plan: Plan) -> list[MessageOut]: ...
    def ask(
        self,
        conv_id: int,
        user_id: int,
        question: str,
        filters: AskFilters | None,
        top_k: int,
        plan: Plan,
        use_documents: bool = True,
    ) -> AsyncGenerator[tuple[str, dict | str], None]: ...


class ConversationService(ConversationServiceProtocol):
    def __init__(
        self,
        conv_repo: ConversationRepositoryProtocol = Depends(ConversationRepository),
        lib_repo: LibraryRepositoryProtocol = Depends(LibraryRepository),
        tier: TierServiceProtocol = Depends(TierService),
        ai: AIProvider = Depends(get_ai_provider),
        answers: AnswerGeneratorProtocol = Depends(AnswerGenerator),
        formatter: ChunkFormatter = Depends(ChunkFormatter),
        citations: CitationExtractor = Depends(CitationExtractor),
    ):
        self.conv_repo = conv_repo
        self.lib_repo = lib_repo
        self.tier = tier
        self.ai = ai
        self.answers = answers
        self.formatter = formatter
        self.citations = citations

    def list_conversations(self, user_id: int) -> list[ConversationOut]:
        return [ConversationOut.model_validate(c) for c in self.conv_repo.get_all(user_id)]

    def search_conversations(self, user_id: int, query: str) -> list[ConversationSearchResult]:
        if len(query) < 2:
            return []
        results = []
        for conversation, matching_content in self.conv_repo.search(user_id, query):
            excerpt = None
            if matching_content:
                match_at = matching_content.casefold().find(query.casefold())
                start = max(0, match_at - 50)
                end = min(len(matching_content), match_at + len(query) + 90)
                excerpt = ("…" if start else "") + matching_content[start:end].strip() + ("…" if end < len(matching_content) else "")
            results.append(ConversationSearchResult(
                **ConversationOut.model_validate(conversation).model_dump(),
                match_excerpt=excerpt,
            ))
        return results

    def new_conversation(self, user_id: int, title: str = DEFAULT_CONVERSATION_TITLE) -> ConversationOut:
        conv = self.conv_repo.create(user_id, title)
        return ConversationOut.model_validate(conv)

    def rename_conversation(self, conv_id: int, user_id: int, title: str) -> ConversationOut:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        conv = self.conv_repo.update_title(conv, title)
        return ConversationOut.model_validate(conv)

    def remove_conversation(self, conv_id: int, user_id: int) -> MessageResponse:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.conv_repo.delete(conv)
        return MessageResponse(message="Conversation deleted")

    def list_messages(self, conv_id: int, user_id: int, plan: Plan) -> list[MessageOut]:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))
        return [MessageOut.model_validate(m) for m in self.conv_repo.get_messages(conv_id)]

    async def ask(
        self,
        conv_id: int,
        user_id: int,
        question: str,
        filters: AskFilters | None,
        top_k: int,
        plan: Plan,
        use_documents: bool = True,
    ) -> AsyncGenerator[tuple[str, dict | str], None]:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))
        log_id = self.tier.check_and_log_ask(plan, user_id)

        answer_started = False
        try:
            async for event in self._answer(conv, conv_id, user_id, question, filters, top_k, use_documents):
                answer_started = answer_started or event[0] == "token"
                yield event
        except Exception:
            # Refund only when no answer text reached the user, so a failure cannot be used to get answers for free.
            if not answer_started:
                self.tier.refund_ask(log_id)
            raise

    async def _answer(
        self,
        conv: Conversation,
        conv_id: int,
        user_id: int,
        question: str,
        filters: AskFilters | None,
        top_k: int,
        use_documents: bool,
    ) -> AsyncGenerator[tuple[str, dict | str], None]:
        history = [] if use_documents else [(m.role, m.content) for m in self.conv_repo.get_recent_messages(conv_id, GENERAL_HISTORY_MESSAGES)]
        self.conv_repo.add_message(conv_id, "user", question)

        if use_documents:
            query_vector = await self.ai.get_embedding(question)
            doc_id = filters.doc_id if filters else None
            results = self.lib_repo.get_top_k_chunks(user_id, query_vector, top_k, doc_id)
            chunks = self.formatter.from_results(results)
            sources = self.formatter.sources(chunks)
            description, badges = await self.answers.describe(chunks, question)
            meta = {"description": description, "badges": badges, "sources": sources}
            tokens = self.answers.stream(chunks, question)
        else:
            sources = []
            meta = {"description": GENERAL_DESCRIPTION, "badges": GENERAL_BADGES, "sources": [], "general": True}
            tokens = self.answers.stream_general(question, history)

        yield "meta", meta

        full_answer = ""
        async for token in tokens:
            full_answer += token
            yield "token", token

        grounded = use_documents and not full_answer.strip().startswith(NOT_FOUND_MESSAGE)
        cited = self.citations.cited(full_answer, len(sources)) if grounded else []
        yield "cited", cited

        stored_meta = {**meta, "sources": [s for s in sources if s["n"] in cited], "cited": cited}
        self.conv_repo.add_message(conv_id, "assistant", full_answer, stored_meta)

        if conv.title == "New conversation":
            short_q = question[:60] + ("…" if len(question) > 60 else "")
            self.conv_repo.update_title(conv, short_q)
        else:
            self.conv_repo.touch(conv)
