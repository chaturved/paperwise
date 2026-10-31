from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from src.core.enums import Plan
from src.core.exceptions import NotFoundError
from src.repositories.conversation_repository import ConversationRepositoryProtocol
from src.services.conversation_service import ConversationService
from src.services.tier_service import TierServiceProtocol


def _make_conv(id=1, title="New conversation", days_old=0):
    conv = MagicMock()
    conv.id = id
    conv.title = title
    conv.created_at = datetime.now(UTC) - timedelta(days=days_old)
    conv.active_leaf_id = None
    return conv


def _node(id: int, parent_id: int | None, role: str, content: str = "", meta: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=id, parent_id=parent_id, role=role, content=content or f"{role} {id}", meta=meta, conversation_id=1,
        created_at=datetime.now(UTC),
    )


class TestConversationService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_conv_repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.mock_tier = MagicMock(spec_set=TierServiceProtocol)
        self.mock_conv_repo.get_messages.return_value = []
        self.svc = ConversationService(conv_repo=self.mock_conv_repo, tier=self.mock_tier)

    def test_list_conversations_returns_validated_list(self):
        conv = _make_conv()
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.get_all.return_value = [conv]

        result = self.svc.list_conversations(user_id=1)

        self.mock_conv_repo.get_all.assert_called_once_with(1)
        assert len(result) == 1

    def test_list_conversations_empty(self):
        self.mock_conv_repo.get_all.return_value = []

        result = self.svc.list_conversations(user_id=1)

        assert result == []

    def test_search_conversations_returns_message_excerpt(self):
        conv = _make_conv(title="Quarterly report")
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.search.return_value = [(conv, "The revenue grew in the third quarter.")]

        result = self.svc.search_conversations(user_id=7, query="revenue")

        self.mock_conv_repo.search.assert_called_once_with(7, "revenue")
        assert len(result) == 1
        assert result[0].title == "Quarterly report"
        assert "revenue" in result[0].match_excerpt

    def test_search_conversations_ignores_short_query(self):
        assert self.svc.search_conversations(user_id=7, query=" ") == []
        self.mock_conv_repo.search.assert_not_called()


    def test_new_conversation_creates_and_returns(self):
        conv = _make_conv(title="Custom title")
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.create.return_value = conv

        result = self.svc.new_conversation(user_id=1, title="Custom title")

        self.mock_conv_repo.create.assert_called_once_with(1, "Custom title")
        assert result.title == "Custom title"


    def test_rename_conversation_raises_when_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.rename_conversation(conv_id=99, user_id=1, title="New")

    def test_rename_conversation_updates_title(self):
        conv = _make_conv(title="Old")
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.get_by_id.return_value = conv

        renamed = _make_conv(title="New")
        renamed.updated_at = datetime.now(UTC)
        self.mock_conv_repo.update_title.return_value = renamed

        result = self.svc.rename_conversation(conv_id=1, user_id=1, title="New")

        self.mock_conv_repo.update_title.assert_called_once_with(conv, "New")
        assert result.title == "New"


    def test_remove_conversation_raises_when_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.remove_conversation(conv_id=99, user_id=1)

    def test_remove_conversation_deletes_and_returns_message(self):
        conv = _make_conv()
        self.mock_conv_repo.get_by_id.return_value = conv

        result = self.svc.remove_conversation(conv_id=1, user_id=1)

        self.mock_conv_repo.delete.assert_called_once_with(conv)
        assert result.message == "Conversation deleted"


    def test_list_messages_raises_when_conv_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.list_messages(conv_id=99, user_id=1, plan=Plan.FREE)

    def test_list_messages_calls_tier_history_check(self):
        conv = _make_conv(days_old=3)
        self.mock_conv_repo.get_by_id.return_value = conv
        self.mock_conv_repo.get_messages.return_value = []

        self.svc.list_messages(conv_id=1, user_id=1, plan=Plan.FREE)

        self.mock_tier.check_history.assert_called_once_with(Plan.FREE, conv.created_at)

    def test_list_messages_returns_messages(self):
        conv = _make_conv()
        msg = MagicMock()
        msg.id = 1
        msg.conversation_id = 1
        msg.role = "user"
        msg.content = "hello"
        msg.meta = None
        msg.parent_id = None
        msg.created_at = datetime.now(UTC)
        self.mock_conv_repo.get_by_id.return_value = conv
        self.mock_conv_repo.get_messages.return_value = [msg]

        result = self.svc.list_messages(conv_id=1, user_id=1, plan=Plan.FREE)

        assert len(result) == 1


class TestMessageVersions:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.conv_repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.tier = MagicMock(spec_set=TierServiceProtocol)
        self.conv = _make_conv(title="My chat")
        self.conv_repo.get_by_id.return_value = self.conv
        self.ids = iter(range(100, 1000))
        self.conv_repo.set_active_leaf.side_effect = lambda conv, message_id: setattr(conv, "active_leaf_id", message_id)
        self.conv_repo.add_message.side_effect = lambda *a, **k: _node(next(self.ids), a[4] if len(a) > 4 else k.get("parent_id"), a[1], a[2], a[3])
        self.svc = ConversationService(conv_repo=self.conv_repo, tier=self.tier)

    def _tree(self) -> list[SimpleNamespace]:
        """1 Q1 -> 2 A1 -> 3 Q2 -> 4 A2, with 5 an edited Q2 -> 6 its answer, and 7 a retried A1."""
        return [
            _node(1, None, "user", "Q1"),
            _node(2, 1, "assistant", "A1"),
            _node(3, 2, "user", "Q2"),
            _node(4, 3, "assistant", "A2"),
            _node(5, 2, "user", "Q2 edited"),
            _node(6, 5, "assistant", "A2 edited"),
            _node(7, 1, "assistant", "A1 retried"),
        ]

    def test_messages_show_the_active_path_and_which_version_each_turn_is(self):
        self.conv.active_leaf_id = 4
        self.conv_repo.get_messages.return_value = self._tree()

        visible = self.svc.list_messages(1, 1, Plan.FREE)

        assert [m.id for m in visible] == [1, 2, 3, 4]
        assert [(m.version, m.versions) for m in visible] == [(1, 1), (1, 2), (1, 2), (1, 1)]
        assert visible[2].sibling_ids == [3, 5]

    def test_switching_to_another_version_continues_down_its_newest_branch(self):
        self.conv_repo.get_messages.return_value = self._tree()

        visible = self.svc.select_version(1, 1, 5, Plan.FREE)

        self.conv_repo.set_active_leaf.assert_called_once_with(self.conv, 6)
        assert [m.id for m in visible] == [1, 2, 5, 6]

    def test_switching_to_a_message_that_is_not_in_the_conversation_fails(self):
        self.conv_repo.get_messages.return_value = self._tree()

        with pytest.raises(NotFoundError):
            self.svc.select_version(1, 1, 99, Plan.FREE)

        self.conv_repo.set_active_leaf.assert_not_called()

    def test_a_branch_copies_the_path_up_to_a_message_into_a_new_conversation(self):
        self.conv_repo.get_messages.return_value = self._tree()
        branch = _make_conv(id=9, title="My chat")
        branch.updated_at = datetime.now(UTC)
        self.conv_repo.create.return_value = branch

        result = self.svc.branch_conversation(1, 1, 5, Plan.FREE)

        self.conv_repo.create.assert_called_once_with(1, "My chat", self.conv.created_at)
        copied = [c.args[1:3] for c in self.conv_repo.add_message.call_args_list]
        assert copied == [("user", "Q1"), ("assistant", "A1"), ("user", "Q2 edited")]
        assert [c.args[4] for c in self.conv_repo.add_message.call_args_list] == [None, 100, 101]
        self.conv_repo.set_active_leaf.assert_called_once_with(branch, 102)
        assert result.id == 9
