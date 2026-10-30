from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from src.repositories.tier_repository import TierRepository


class TestTierRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = TierRepository(db=self.db)

    def test_count_queries_calls_scalar(self):
        self.db.scalar.return_value = 3
        result = self.repo.count_queries_24h(user_id=1)
        assert result == 3
        self.db.scalar.assert_called_once()

    def test_log_query_adds_and_commits(self):
        self.repo.log_query(user_id=1)
        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()

    def test_remove_query_deletes_the_entry_and_commits(self):
        self.repo.remove_query(log_id=5)
        self.db.query.return_value.filter.return_value.delete.assert_called_once()
        self.db.commit.assert_called_once()
