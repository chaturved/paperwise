from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends

from src.core.enums import DocumentStatus, Plan
from src.core.exceptions import AppError, BadRequestError, NotFoundError
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
from src.models import Conversation, Message
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
    FollowUpsResponse,
    MessageOut,
)
from src.schemas.user import MessageResponse
from src.services.answer_generator import NOT_FOUND_MESSAGE, AnswerGenerator, AnswerGeneratorProtocol
from src.services.tier_service import TierService, TierServiceProtocol
from src.utils.chunk_formatter import ChunkFormatter
from src.utils.citations import CitationExtractor
from src.utils.message_tree import MessageTree

HISTORY_MESSAGES = 10
FAILED_MESSAGE = "Something went wrong. Please try again."


class ConversationServiceProtocol(Protocol):
    def list_conversations(self, user_id: int) -> list[ConversationOut]: ...
    def search_conversations(self, user_id: int, query: str) -> list[ConversationSearchResult]: ...
    def new_conversation(self, user_id: int, title: str) -> ConversationOut: ...
    def rename_conversation(self, conv_id: int, user_id: int, title: str) -> ConversationOut: ...
    def remove_conversation(self, conv_id: int, user_id: int) -> MessageResponse: ...
    def list_messages(self, conv_id: int, user_id: int, plan: Plan) -> list[MessageOut]: ...
    def select_version(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> list[MessageOut]: ...
    def branch_conversation(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> ConversationOut: ...
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
        return self._visible_messages(conv)

    def select_version(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> list[MessageOut]:
        """Switch to another version of a turn: the conversation continues down that version's newest branch."""
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        self._existing(tree, message_id)
        leaf = tree.latest_leaf(message_id)
        self.conv_repo.set_active_leaf(conv, leaf.id if leaf else message_id)
        return self._visible_messages(conv)

    def branch_conversation(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> ConversationOut:
        """Start a new conversation holding everything up to `message_id`; the original is left as it is."""
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        self._existing(tree, message_id)
        # The copy keeps the original's date, so branching cannot extend how long a Free plan can see old chats.
        branch = self.conv_repo.create(user_id, conv.title, conv.created_at)
        parent_id: int | None = None
        for message in tree.path_to(message_id):
            parent_id = self.conv_repo.add_message(branch.id, message.role, message.content, message.meta, parent_id).id
        self.conv_repo.set_active_leaf(branch, parent_id)
        return ConversationOut.model_validate(branch)

    def _visible_messages(self, conv: Conversation) -> list[MessageOut]:
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        visible = []
        for message in tree.path_to(conv.active_leaf_id):
            versions = tree.versions(message)
            visible.append(
                MessageOut.model_validate(message).model_copy(
                    update={
                        "version": [v.id for v in versions].index(message.id) + 1,
                        "versions": len(versions),
                        "sibling_ids": [v.id for v in versions],
                    }
                )
            )
        return visible

    @staticmethod
    def _existing(tree: MessageTree[Message], message_id: int, role: str | None = None) -> Message:
        message = tree.by_id.get(message_id)
        if message is None or (role is not None and message.role != role):
            raise NotFoundError("Message not found")
        return message

    @staticmethod
    def _history(tree: MessageTree[Message], end_id: int | None) -> list[tuple[str, str]]:
        """The earlier turns of the path ending at `end_id`, without answers that failed."""
        if end_id is None:
            return []
        recent = [m for m in tree.path_to(end_id) if not (m.meta or {}).get("failed")][-HISTORY_MESSAGES:]
        return [(m.role, m.content) for m in recent]

    async def follow_ups(self, conv_id: int, user_id: int) -> FollowUpsResponse:
        """Suggestions are a nicety: when the model fails or there is nothing to follow up on, return none."""
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        recent = MessageTree(self.conv_repo.get_messages(conv.id)).path_to(conv.active_leaf_id)[-2:]
        if len(recent) < 2 or recent[-1].role != "assistant" or recent[-2].role != "user":
            return FollowUpsResponse(questions=[])
        answer = recent[-1]
        if (answer.meta or {}).get("failed") or answer.content.startswith(NOT_FOUND_MESSAGE):
            return FollowUpsResponse(questions=[])
        try:
            questions = await self.answers.follow_ups(recent[-2].content, answer.content)
        except Exception:  # noqa: BLE001 - suggestions are optional, so any failure just means none
            return FollowUpsResponse(questions=[])
        return FollowUpsResponse(questions=questions)

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
    ) -> AsyncGenerator[tuple[str, dict | str], None]:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
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
            # Refund only when no answer text reached the user, so a failure cannot be used to get answers for free.
            if not answer_started:
                self.tier.refund_ask(log_id)
                if asked is not None:
                    self._record_failure(conv, asked, error)
            raise

    def _open_turn(
        self, conv: Conversation, question: str, edit_of: int | None, retry_of: int | None
    ) -> tuple[Message, str, list[tuple[str, str]]]:
        """Find or store the question being answered, and the earlier turns the answer can see.

        A new question continues the visible path. An edit stores a sibling of the question it replaces. A retry
        answers the same question again, so no new question is stored.
        """
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        if retry_of is not None:
            answer = self._existing(tree, retry_of, "assistant")
            asked = tree.by_id.get(answer.parent_id) if answer.parent_id is not None else None
            if asked is None:
                raise BadRequestError("That answer has no question to retry")
            return asked, asked.content, self._history(tree, asked.parent_id)

        if edit_of is not None:
            parent_id = self._existing(tree, edit_of, "user").parent_id
        else:
            visible = tree.path_to(conv.active_leaf_id)
            parent_id = visible[-1].id if visible else None
        history = self._history(tree, parent_id)
        asked = self.conv_repo.add_message(conv.id, "user", question, None, parent_id)
        self.conv_repo.set_active_leaf(conv, asked.id)
        return asked, question, history

    def _record_failure(self, conv: Conversation, asked: Message, error: Exception) -> None:
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
        recent: list[tuple[str, str]],
        user_id: int,
        filters: AskFilters | None,
        top_k: int,
    ) -> AsyncGenerator[tuple[str, dict | str], None]:
        documents = self._has_documents(user_id, filters)

        if documents:
            query_vector = await self.ai.get_embedding(question)
            results = self.lib_repo.get_top_k_chunks(user_id, query_vector, top_k, self._scope(filters))
            chunks = self.formatter.from_results(results)
            sources = self.formatter.sources(chunks)
            meta = {"description": "", "badges": [], "sources": sources}
            tokens = self.answers.stream(chunks, question, recent)
        else:
            sources = []
            meta = {"description": "", "badges": [], "sources": []}
            tokens = self.answers.stream_general(question, recent)

        yield "meta", meta

        full_answer = ""
        async for token in tokens:
            full_answer += token
            yield "token", token

        grounded = documents and not full_answer.strip().startswith(NOT_FOUND_MESSAGE)
        cited = self.citations.cited(full_answer, len(sources)) if grounded else []
        yield "cited", cited

        stored_meta = {**meta, "sources": [s for s in sources if s["n"] in cited], "cited": cited}
        answer = self.conv_repo.add_message(conv.id, "assistant", full_answer, stored_meta, asked.id)
        self.conv_repo.set_active_leaf(conv, answer.id)

        if conv.title == "New conversation":
            short_q = question[:60] + ("…" if len(question) > 60 else "")
            self.conv_repo.update_title(conv, short_q)
        else:
            self.conv_repo.touch(conv)
