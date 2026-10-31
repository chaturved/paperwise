from datetime import UTC, datetime
from typing import Protocol

from fastapi import Depends

from src.core.enums import Plan
from src.core.exceptions import NotFoundError
from src.models import Conversation, Message
from src.repositories.conversation_repository import (
    ConversationRepository,
    ConversationRepositoryProtocol,
)
from src.schemas.conversation import (
    DEFAULT_CONVERSATION_TITLE,
    ConversationOut,
    ConversationSearchResult,
    MessageOut,
)
from src.schemas.user import MessageResponse
from src.services.tier_service import TierService, TierServiceProtocol
from src.utils.message_tree import MessageTree

EXCERPT_BEFORE = 50
EXCERPT_AFTER = 90


class ConversationServiceProtocol(Protocol):
    def list_conversations(self, user_id: int) -> list[ConversationOut]: ...
    def search_conversations(self, user_id: int, query: str) -> list[ConversationSearchResult]: ...
    def new_conversation(self, user_id: int, title: str) -> ConversationOut: ...
    def rename_conversation(self, conv_id: int, user_id: int, title: str) -> ConversationOut: ...
    def remove_conversation(self, conv_id: int, user_id: int) -> MessageResponse: ...
    def list_messages(self, conv_id: int, user_id: int, plan: Plan) -> list[MessageOut]: ...
    def select_version(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> list[MessageOut]: ...
    def branch_conversation(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> ConversationOut: ...


class ConversationService(ConversationServiceProtocol):
    def __init__(
        self,
        conv_repo: ConversationRepositoryProtocol = Depends(ConversationRepository),
        tier: TierServiceProtocol = Depends(TierService),
    ):
        self.conv_repo = conv_repo
        self.tier = tier

    def list_conversations(self, user_id: int) -> list[ConversationOut]:
        return [ConversationOut.model_validate(c) for c in self.conv_repo.get_all(user_id)]

    def search_conversations(self, user_id: int, query: str) -> list[ConversationSearchResult]:
        if len(query) < 2:
            return []
        return [
            ConversationSearchResult(
                **ConversationOut.model_validate(conversation).model_dump(),
                match_excerpt=self._excerpt(matching_content, query),
            )
            for conversation, matching_content in self.conv_repo.search(user_id, query)
        ]

    def new_conversation(self, user_id: int, title: str = DEFAULT_CONVERSATION_TITLE) -> ConversationOut:
        conv = self.conv_repo.create(user_id, title)
        return ConversationOut.model_validate(conv)

    def rename_conversation(self, conv_id: int, user_id: int, title: str) -> ConversationOut:
        conv = self.conv_repo.update_title(self._conversation(conv_id, user_id), title)
        return ConversationOut.model_validate(conv)

    def remove_conversation(self, conv_id: int, user_id: int) -> MessageResponse:
        self.conv_repo.delete(self._conversation(conv_id, user_id))
        return MessageResponse(message="Conversation deleted")

    def list_messages(self, conv_id: int, user_id: int, plan: Plan) -> list[MessageOut]:
        return self._visible_messages(self._readable(conv_id, user_id, plan))

    def select_version(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> list[MessageOut]:
        """Switch to another version of a turn: the conversation continues down that version's newest branch."""
        conv = self._readable(conv_id, user_id, plan)
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        tree.require(message_id)
        leaf = tree.latest_leaf(message_id)
        self.conv_repo.set_active_leaf(conv, leaf.id if leaf else message_id)
        return self._visible_messages(conv)

    def branch_conversation(self, conv_id: int, user_id: int, message_id: int, plan: Plan) -> ConversationOut:
        """Start a new conversation holding everything up to `message_id`; the original is left as it is."""
        conv = self._readable(conv_id, user_id, plan)
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        tree.require(message_id)
        # The copy keeps the original's date, so branching cannot extend how long a Free plan can see old chats.
        branch = self.conv_repo.create(user_id, conv.title, conv.created_at)
        parent_id: int | None = None
        for message in tree.path_to(message_id):
            parent_id = self.conv_repo.add_message(branch.id, message.role, message.content, message.meta, parent_id).id
        self.conv_repo.set_active_leaf(branch, parent_id)
        return ConversationOut.model_validate(branch)

    def _conversation(self, conv_id: int, user_id: int) -> Conversation:
        conv = self.conv_repo.get_by_id(conv_id, user_id)
        if not conv:
            raise NotFoundError("Conversation not found")
        return conv

    def _readable(self, conv_id: int, user_id: int, plan: Plan) -> Conversation:
        """The conversation, if the plan still allows reading something this old."""
        conv = self._conversation(conv_id, user_id)
        self.tier.check_history(plan, conv.created_at or datetime.now(UTC))
        return conv

    def _visible_messages(self, conv: Conversation) -> list[MessageOut]:
        tree = MessageTree(self.conv_repo.get_messages(conv.id))
        return [self._with_versions(message, tree) for message in tree.path_to(conv.active_leaf_id)]

    @staticmethod
    def _with_versions(message: Message, tree: MessageTree[Message]) -> MessageOut:
        sibling_ids = [version.id for version in tree.versions(message)]
        return MessageOut.model_validate(message).model_copy(
            update={
                "version": sibling_ids.index(message.id) + 1,
                "versions": len(sibling_ids),
                "sibling_ids": sibling_ids,
            }
        )

    @staticmethod
    def _excerpt(content: str | None, query: str) -> str | None:
        """A short stretch of the matching message around the search text."""
        if not content:
            return None
        match_at = content.casefold().find(query.casefold())
        start = max(0, match_at - EXCERPT_BEFORE)
        end = min(len(content), match_at + len(query) + EXCERPT_AFTER)
        return ("…" if start else "") + content[start:end].strip() + ("…" if end < len(content) else "")
