from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from src.models.waitlist import Waitlist
from src.repositories.waitlist_repository import WaitlistRepository


class TestWaitlistRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = WaitlistRepository(db=self.db)

    def test_add_persists_and_returns_entry(self):
        self.repo.add("new@example.com")

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once()
        added = self.db.add.call_args[0][0]
        assert isinstance(added, Waitlist)
        assert added.email == "new@example.com"

    def test_exists_returns_true_when_email_found(self):
        self.db.query.return_value.filter.return_value.first.return_value = MagicMock(spec=Waitlist)

        result = self.repo.exists("existing@example.com")

        assert result is True

    def test_exists_returns_false_when_email_not_found(self):
        self.db.query.return_value.filter.return_value.first.return_value = None

        result = self.repo.exists("missing@example.com")

        assert result is False
