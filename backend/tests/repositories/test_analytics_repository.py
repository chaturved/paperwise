from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.models import MessageFeedback, QueryUsageLog
from src.repositories.analytics_repository import AnalyticsRepository


class TestAnalyticsRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = AnalyticsRepository(db=self.db)

    def test_get_overview_returns_expected_keys(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = 5
        self.db.query.return_value.join.return_value.filter.return_value.scalar.return_value = 10
        self.db.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

        result = self.repo.get_overview(user_id=1)

        assert "total_queries" in result
        assert "total_docs" in result
        assert "total_chunks" in result
        assert "quality_pct" in result
        assert "thumbs_up" in result
        assert "thumbs_down" in result
        assert "queries_last_30d" in result

    def test_get_overview_quality_pct_none_when_no_feedback(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = 0
        self.db.query.return_value.join.return_value.filter.return_value.scalar.return_value = 0
        self.db.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

        result = self.repo.get_overview(user_id=1)

        assert result["quality_pct"] is None
        assert result["thumbs_up"] == 0
        assert result["thumbs_down"] == 0

    def test_get_overview_computes_quality_pct_from_feedback(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = 0
        self.db.query.return_value.join.return_value.filter.return_value.scalar.return_value = 0
        up_row = MagicMock()
        up_row.__getitem__ = lambda self, i: "up" if i == 0 else 3
        down_row = MagicMock()
        down_row.__getitem__ = lambda self, i: "down" if i == 0 else 1
        self.db.query.return_value.filter.return_value.group_by.return_value.all.return_value = [("up", 3), ("down", 1)]

        result = self.repo.get_overview(user_id=1)

        assert result["thumbs_up"] == 3
        assert result["thumbs_down"] == 1
        assert result["quality_pct"] == 75

    def test_get_query_volume_returns_list_of_dicts(self):
        row = MagicMock()
        row.day = "2024-01-01"
        row.count = 5
        (
            self.db.query.return_value.filter.return_value.group_by.return_value.order_by.return_value.all.return_value
        ) = [row]

        result = self.repo.get_query_volume(user_id=1, days=30)

        assert result == [{"date": "2024-01-01", "count": 5}]

    def test_get_query_volume_empty(self):
        (
            self.db.query.return_value.filter.return_value.group_by.return_value.order_by.return_value.all.return_value
        ) = []

        result = self.repo.get_query_volume(user_id=1, days=7)

        assert result == []

    def test_upsert_feedback_updates_existing(self):
        existing = MagicMock(spec=MessageFeedback)
        existing.value = "up"
        self.db.query.return_value.filter.return_value.first.return_value = existing

        result = self.repo.upsert_feedback(message_id=1, user_id=1, value="down")

        assert existing.value == "down"
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(existing)
        assert result == existing

    def test_upsert_feedback_creates_new_when_not_existing(self):
        self.db.query.return_value.filter.return_value.first.return_value = None

        self.repo.upsert_feedback(message_id=1, user_id=1, value="up")

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        added = self.db.add.call_args[0][0]
        assert isinstance(added, MessageFeedback)
        assert added.message_id == 1
        assert added.value == "up"

    def test_get_user_feedbacks_returns_empty_dict_for_no_ids(self):
        result = self.repo.get_user_feedbacks(user_id=1, message_ids=[])

        assert result == {}
        self.db.query.assert_not_called()

    def test_get_user_feedbacks_returns_mapped_dict(self):
        row1, row2 = MagicMock(), MagicMock()
        row1.message_id = 1
        row1.value = "up"
        row2.message_id = 2
        row2.value = "down"
        self.db.query.return_value.filter.return_value.all.return_value = [row1, row2]

        result = self.repo.get_user_feedbacks(user_id=1, message_ids=[1, 2])

        assert result == {1: "up", 2: "down"}


class TestQuestionsAreCountedFromTheAskLog:
    """Run against a real database, because a mocked session cannot tell which table a query reads."""

    @pytest.fixture
    def repo(self):
        engine = create_engine("sqlite://")
        QueryUsageLog.__table__.create(engine)
        with Session(engine) as session:
            now = datetime.now(UTC).replace(tzinfo=None)
            session.add_all(
                [
                    QueryUsageLog(user_id=1, created_at=now),
                    QueryUsageLog(user_id=1, created_at=now),
                    QueryUsageLog(user_id=1, created_at=now - timedelta(days=40)),
                    QueryUsageLog(user_id=2, created_at=now),
                ]
            )
            session.commit()
            yield AnalyticsRepository(db=session)

    def test_all_time_count_includes_only_that_users_questions(self, repo):
        assert repo.count_questions(user_id=1) == 3
        assert repo.count_questions(user_id=2) == 1
        assert repo.count_questions(user_id=3) == 0

    def test_count_can_be_limited_to_recent_questions(self, repo):
        assert repo.count_questions(user_id=1, since=datetime.now(UTC) - timedelta(days=30)) == 2

    def test_volume_groups_the_last_days_by_date(self, repo):
        today = datetime.now(UTC).date().isoformat()

        assert repo.get_query_volume(user_id=1, days=30) == [{"date": today, "count": 2}]
