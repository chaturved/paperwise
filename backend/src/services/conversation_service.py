from datetime import datetime, timezone
from typing import AsyncGenerator, Protocol

from fastapi import Depends

from src.core.enums import Plan
from src.core.exceptions import NotFoundError
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
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
from src.services.answer_generator import AnswerGenerator, AnswerGeneratorProtocol
from src.services.tier_service import TierService, TierServiceProtocol
from src.utils.chunk_formatter import ChunkFormatter


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
    ):
        self.conv_repo = conv_repo
        self.lib_repo = lib_repo
        self.tier = tier
        self.ai = ai
        self.answers = answers
        self.formatter = formatter

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
        self.tier.check_history(plan, conv.created_at or datetime.now(timezone.utc))
        return [MessageOut.model_validate(m) for m in self.conv_repo.get_messages(conv_id)]

    async def ask(
        self,
        conv_id: int,
        user_id: int,
        question: str,
        filters: AskFilters | None,
        top_k: int,
        plan: Plan,
    ) -> AsyncGenerator[tuple[str, dict | str], None]:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.tier.check_history(plan, conv.created_at or datetime.now(timezone.utc))
        self.tier.check_and_log_ask(plan, user_id)

        self.conv_repo.add_message(conv_id, "user", question)

        query_vector = await self.ai.get_embedding(question)
        doc_id = filters.doc_id if filters else None
        results = self.lib_repo.get_top_k_chunks(user_id, query_vector, top_k, doc_id)
        chunks = self.formatter.from_results(results)
        context_text = self.formatter.context_text(chunks)

        description, badges = await self.answers.describe(chunks, question)
        meta = {
            "description": description,
            "badges": badges,
            "snippets": self.formatter.snippets(chunks),
            "sources": self.formatter.sources(chunks),
        }

        yield "meta", meta

        full_answer = ""
        async for token in self.answers.stream(context_text, question):
            full_answer += token
            yield "token", token

        self.conv_repo.add_message(conv_id, "assistant", full_answer, meta)

        if conv.title == "New conversation":
            short_q = question[:60] + ("…" if len(question) > 60 else "")
            self.conv_repo.update_title(conv, short_q)
        else:
            self.conv_repo.touch(conv)
