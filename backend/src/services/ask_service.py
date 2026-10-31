from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends

from src.core.enums import DocumentStatus, Plan
from src.core.exceptions import AppError, BadRequestError, NotFoundError
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
from src.models import Conversation, Message
from src.repositories.conversation_repository import ConversationRepository, ConversationRepositoryProtocol
from src.repositories.library_repository import LibraryRepository, LibraryRepositoryProtocol
from src.schemas.conversation import DEFAULT_CONVERSATION_TITLE, AskFilters, FollowUpsResponse
from src.services.answer_generator import NOT_FOUND_MESSAGE, AnswerGenerator, AnswerGeneratorProtocol
from src.services.tier_service import TierService, TierServiceProtocol
from src.utils.chunk_formatter import ChunkFormatter
from src.utils.citations import CitationExtractor
from src.utils.message_tree import MessageTree

HISTORY_MESSAGES = 10
TITLE_MAX_CHARS = 60
FAILED_MESSAGE = "Something went wrong. Please try again."

Event = tuple[str, dict | str | list[int]]
Transcript = list[tuple[str, str]]


class AskServiceProtocol(Protocol):
    async def follow_ups(self, conv_id: int, user_id: int) -> FollowUpsResponse: ...
    def ask(
        self,
        conv_id: int,
        user_id: int,
        question: str,
        filters: AskFilters | None,
        top_k: int,
        plan: Plan,
        edit_of: int | None = None,
        retry_of: int | None = None,
    ) -> AsyncGenerator[Event, None]: ...


class AskService(AskServiceProtocol):
    """Answers a question in a conversation: finds the passages, streams the reply and stores the turn."""

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

    async def follow_ups(self, conv_id: int, user_id: int) -> FollowUpsResponse:
        """Suggestions are a nicety: when the model fails or there is nothing to follow up on, return none."""
        conv = self._conversation(conv_id, user_id)
        exchange = self._last_exchange(conv)
        if exchange is None:
            return FollowUpsResponse(questions=[])
        question, answer = exchange
        try:
            return FollowUpsResponse(questions=await self.answers.follow_ups(question.content, answer.content))
        except Exception:  # noqa: BLE001 - suggestions are optional, so any failure just means none
            return FollowUpsResponse(questions=[])

    async def ask(
        self,
        conv_id: int,
        user_id: int,
        question: str,
        filters: AskFilters | None,
        top_k: int,
        plan: Plan,
        edit_of: int | None = None,
        retry_of: int | None = None,
    ) -> AsyncGenerator[Event, None]:
        conv = self._conversation(conv_id, user_id)
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))
        log_id = self.tier.check_and_log_ask(plan, user_id)

        answer_started = False
        asked: Message | None = None
        try:
            asked, question, history = self._open_turn(conv, question, edit_of, retry_of)
            async for event in self._answer(conv, asked, question, history, user_id, filters, top_k):
                answer_started = answer_started or event[0] == "token"
                yield event
        except Exception as error:
            if not answer_started:
                self._abandon(conv, asked, log_id, error)
            raise

    def _conversation(self, conv_id: int, user_id: int) -> Conversation:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        return conv

    def _last_exchange(self, conv: Conversation) -> tuple[Message, Message] | None:
        """The latest question and its answer, when there is an answer worth following up on."""
        visible = MessageTree(self.conv_repo.get_messages(conv.id)).path_to(conv.active_leaf_id)[-2:]
        if len(visible) < 2:
            return None
        question, answer = visible
        if question.role != "user" or answer.role != "assistant":
            return None
        if (answer.meta or {}).get("failed") or answer.content.startswith(NOT_FOUND_MESSAGE):
            return None
        return question, answer

    def _open_turn(
        self, conv: Conversation, question: str, edit_of: int | None, retry_of: int | None
    ) -> tuple[Message, str, Transcript]:
        """Find or store the question being answered, and the earlier turns the answer can see."""
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        if retry_of is not None:
            return self._retried_turn(tree, retry_of)
        return self._new_turn(conv, tree, question, edit_of)

    def _retried_turn(self, tree: MessageTree[Message], retry_of: int) -> tuple[Message, str, Transcript]:
        """A retry answers the same question again, so no new question is stored."""
        asked = tree.parent_of(tree.require(retry_of, "assistant"))
        if asked is None:
            raise BadRequestError("That answer has no question to retry")
        return asked, asked.content, self._history(tree, asked.parent_id)

    def _new_turn(
        self, conv: Conversation, tree: MessageTree[Message], question: str, edit_of: int | None
    ) -> tuple[Message, str, Transcript]:
        """A new question continues the visible path; an edit is stored beside the question it replaces."""
        if edit_of is not None:
            parent_id = tree.require(edit_of, "user").parent_id
        else:
            visible = tree.path_to(conv.active_leaf_id)
            parent_id = visible[-1].id if visible else None
        history = self._history(tree, parent_id)
        asked = self.conv_repo.add_message(conv.id, "user", question, None, parent_id)
        self.conv_repo.set_active_leaf(conv, asked.id)
        return asked, question, history

    @staticmethod
    def _history(tree: MessageTree[Message], end_id: int | None) -> Transcript:
        """The earlier turns of the path ending at `end_id`, without answers that failed."""
        if end_id is None:
            return []
        recent = [m for m in tree.path_to(end_id) if not (m.meta or {}).get("failed")][-HISTORY_MESSAGES:]
        return [(m.role, m.content) for m in recent]

    def _abandon(self, conv: Conversation, asked: Message | None, log_id: int, error: Exception) -> None:
        """Give the question back and keep the failure in the conversation.

        Only called when no answer text reached the user, so a failure cannot be used to get answers for free.
        """
        self.tier.refund_ask(log_id)
        if asked is not None:
            message = error.message if isinstance(error, AppError) else FAILED_MESSAGE
            meta = {"description": "", "badges": [], "sources": [], "failed": True}
            failed = self.conv_repo.add_message(conv.id, "assistant", message, meta, asked.id)
            self.conv_repo.set_active_leaf(conv, failed.id)

    @staticmethod
    def _scope(filters: AskFilters | None) -> list[int] | None:
        """The documents the user picked on purpose, or None to search everything."""
        if not filters:
            return None
        ids = list(filters.doc_ids or [])
        if filters.doc_id and filters.doc_id not in ids:
            ids.append(filters.doc_id)
        return ids or None

    def _has_documents(self, user_id: int, filters: AskFilters | None) -> bool:
        """Whether there is anything to search: a document picked on purpose, or any document that is ready."""
        if self._scope(filters):
            return True
        return any(lib.status == DocumentStatus.READY for lib in self.lib_repo.get_all(user_id))

    async def _answer(
        self,
        conv: Conversation,
        asked: Message,
        question: str,
        history: Transcript,
        user_id: int,
        filters: AskFilters | None,
        top_k: int,
    ) -> AsyncGenerator[Event, None]:
        documents = self._has_documents(user_id, filters)
        if documents:
            sources, tokens = await self._grounded(question, history, user_id, filters, top_k)
        else:
            sources, tokens = [], self.answers.stream_general(question, history)

        meta = {"description": "", "badges": [], "sources": sources}
        yield "meta", meta

        full_answer = ""
        async for token in tokens:
            full_answer += token
            yield "token", token

        cited = self._cited(full_answer, sources, documents)
        yield "cited", cited

        self._store_answer(conv, asked, question, full_answer, meta, cited)

    async def _grounded(
        self, question: str, history: Transcript, user_id: int, filters: AskFilters | None, top_k: int
    ) -> tuple[list[dict], AsyncGenerator[str, None]]:
        """The numbered passages for the question, and the stream of an answer that may cite them."""
        query_vector = await self.ai.get_embedding(question)
        results = self.lib_repo.get_top_k_chunks(user_id, query_vector, top_k, self._scope(filters))
        chunks = self.formatter.from_results(results)
        return self.formatter.sources(chunks), self.answers.stream(chunks, question, history)

    def _cited(self, answer: str, sources: list[dict], documents: bool) -> list[int]:
        """The source numbers the answer relies on; none when it says the documents do not have the answer."""
        if not documents or answer.strip().startswith(NOT_FOUND_MESSAGE):
            return []
        return self.citations.cited(answer, len(sources))

    def _store_answer(
        self, conv: Conversation, asked: Message, question: str, answer: str, meta: dict, cited: list[int]
    ) -> None:
        stored_meta = {**meta, "sources": [s for s in meta["sources"] if s["n"] in cited], "cited": cited}
        stored = self.conv_repo.add_message(conv.id, "assistant", answer, stored_meta, asked.id)
        self.conv_repo.set_active_leaf(conv, stored.id)

        if conv.title == DEFAULT_CONVERSATION_TITLE:
            self.conv_repo.update_title(conv, self._title_from(question))
        else:
            self.conv_repo.touch(conv)

    @staticmethod
    def _title_from(question: str) -> str:
        return question[:TITLE_MAX_CHARS] + ("…" if len(question) > TITLE_MAX_CHARS else "")
