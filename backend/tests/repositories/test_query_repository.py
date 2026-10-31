from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from src.models import RecentQuery
from src.repositories.query_repository import QueryRepository


class TestQueryRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = QueryRepository(db=self.db)

    def test_add_recent_query_persists_and_returns(self):
        self.repo.add_recent_query(user_id=1, query="what is RAG?")

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        added = self.db.add.call_args[0][0]
        assert isinstance(added, RecentQuery)
        assert added.user_id == 1
        assert added.query == "what is RAG?"

    def test_get_recent_queries_returns_ordered_list(self):
        expected = [MagicMock(spec=RecentQuery), MagicMock(spec=RecentQuery)]
        (
            self.db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value
        ) = expected

        result = self.repo.get_recent_queries(user_id=1, limit=5)

        assert result == expected
        self.db.query.assert_called_once_with(RecentQuery)

    def test_get_recent_queries_uses_default_limit(self):
        self.db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        self.repo.get_recent_queries(user_id=1)

        limit_call = self.db.query.return_value.filter.return_value.order_by.return_value.limit.call_args
        assert limit_call[0][0] == 5
