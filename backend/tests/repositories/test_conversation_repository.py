from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from src.models.conversation import Conversation
from src.models.message import Message
from src.repositories.conversation_repository import ConversationRepository


class TestConversationRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = ConversationRepository(db=self.db)

    # ── create ────────────────────────────────────────────────────────────────

    def test_create_adds_commits_and_returns(self):
        self.repo.create(user_id=1, title="My convo")

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once()
        added_obj = self.db.add.call_args[0][0]
        assert isinstance(added_obj, Conversation)
        assert added_obj.user_id == 1
        assert added_obj.title == "My convo"

    def test_create_uses_default_title(self):
        self.repo.create(user_id=1)

        added_obj = self.db.add.call_args[0][0]
        assert added_obj.title == "New conversation"

    # ── get_all ───────────────────────────────────────────────────────────────

    def test_get_all_returns_ordered_conversations(self):
        expected = [MagicMock(spec=Conversation), MagicMock(spec=Conversation)]
        self.db.query.return_value.filter.return_value.order_by.return_value.all.return_value = expected

        result = self.repo.get_all(user_id=1)

        assert result == expected
        self.db.query.assert_called_once_with(Conversation)

    def test_search_scopes_results_to_user_and_limits_matches(self):
        rows = [(MagicMock(spec=Conversation), "matching text")]
        query = self.db.query.return_value
        query.filter.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = rows

        result = self.repo.search(user_id=7, query="matching")

        assert result == rows
        user_filter = query.filter.call_args.args[0]
        assert user_filter.left.compare(Conversation.__table__.c.user_id)
        assert user_filter.right.value == 7
        query.filter.return_value.filter.return_value.order_by.return_value.limit.assert_called_once_with(25)

    # ── get_by_id ─────────────────────────────────────────────────────────────

    def test_get_by_id_returns_matching(self):
        expected = MagicMock(spec=Conversation)
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_by_id(conv_id=1, user_id=1)

        assert result == expected

    def test_get_by_id_returns_none_when_missing(self):
        self.db.query.return_value.filter.return_value.first.return_value = None

        result = self.repo.get_by_id(conv_id=99, user_id=1)

        assert result is None

    # ── update_title ──────────────────────────────────────────────────────────

    def test_update_title_sets_title_and_returns(self):
        conv = MagicMock(spec=Conversation)
        self.db.refresh.return_value = None

        result = self.repo.update_title(conv, "New Title")

        assert conv.title == "New Title"
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(conv)
        assert result == conv

    # ── touch ─────────────────────────────────────────────────────────────────

    def test_touch_sets_updated_at_and_commits(self):
        conv = MagicMock(spec=Conversation)

        self.repo.touch(conv)

        self.db.commit.assert_called_once()

    # ── delete ────────────────────────────────────────────────────────────────

    def test_delete_removes_and_commits(self):
        conv = MagicMock(spec=Conversation)

        self.repo.delete(conv)

        self.db.delete.assert_called_once_with(conv)
        self.db.commit.assert_called_once()

    # ── add_message ───────────────────────────────────────────────────────────

    def test_add_message_creates_persists_and_returns(self):
        self.repo.add_message(conversation_id=1, role="user", content="hello")

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once()
        added = self.db.add.call_args[0][0]
        assert isinstance(added, Message)
        assert added.conversation_id == 1
        assert added.role == "user"
        assert added.content == "hello"

    def test_add_message_with_meta(self):
        meta = {"sources": ["doc.pdf"]}

        self.repo.add_message(conversation_id=1, role="assistant", content="answer", meta=meta)

        added = self.db.add.call_args[0][0]
        assert added.meta == meta

    # ── get_messages ──────────────────────────────────────────────────────────

    def test_get_messages_returns_ordered_asc(self):
        msgs = [MagicMock(spec=Message), MagicMock(spec=Message)]
        self.db.query.return_value.filter.return_value.order_by.return_value.all.return_value = msgs

        result = self.repo.get_messages(conversation_id=1)

        assert result == msgs

    # ── get_recent_messages ───────────────────────────────────────────────────

    def test_get_recent_messages_returns_chronological_order(self):
        msg1, msg2 = MagicMock(spec=Message), MagicMock(spec=Message)
        # DB returns newest-first [msg2, msg1]; repo reverses to chronological
        (
            self.db.query.return_value
            .filter.return_value
            .order_by.return_value
            .limit.return_value
            .all.return_value
        ) = [msg2, msg1]

        result = self.repo.get_recent_messages(conversation_id=1, limit=2)

        assert result == [msg1, msg2]
