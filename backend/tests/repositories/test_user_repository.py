from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.models.magic_token import MagicToken
from src.models.query_usage_log import QueryUsageLog
from src.models.reset_token import ResetToken
from src.models.user import User
from src.repositories.user_repository import UserRepository


class TestUserRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = UserRepository(db=self.db)


    def test_add_persists_and_returns_user(self):
        user = MagicMock(spec=User)

        result = self.repo.add(user)

        self.db.add.assert_called_once_with(user)
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(user)
        assert result == user


    def test_get_by_email_returns_user(self):
        expected = MagicMock(spec=User)
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_by_email("user@example.com")

        assert result == expected

    def test_get_by_email_returns_none_when_not_found(self):
        self.db.query.return_value.filter.return_value.first.return_value = None

        result = self.repo.get_by_email("missing@example.com")

        assert result is None


    def test_get_by_id_returns_user(self):
        expected = MagicMock(spec=User)
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_by_id(1)

        assert result == expected


    def test_update_commits_and_refreshes(self):
        user = MagicMock(spec=User)

        result = self.repo.update(user)

        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(user)
        assert result == user


    def test_delete_removes_and_commits(self):
        user = MagicMock(spec=User)

        self.repo.delete(user)

        self.db.delete.assert_called_once_with(user)
        self.db.commit.assert_called_once()


    def test_get_oauth_account_returns_matching(self):
        expected = MagicMock()
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_oauth_account("google", "sub-123")

        assert result == expected


    def test_create_oauth_account_persists_and_returns(self):
        self.repo.create_oauth_account(
            user_id=1, provider="google", provider_user_id="sub-123",
            access_token="tok", refresh_token=None,
        )

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once()


    def test_invalidate_magic_tokens_deletes_and_commits(self):
        self.repo.invalidate_magic_tokens("user@example.com")

        self.db.commit.assert_called_once()

    def test_create_magic_token_persists_and_returns(self):
        expires = datetime.now(UTC) + timedelta(minutes=15)

        self.repo.create_magic_token("user@example.com", "hash123", expires)

        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once()
        added = self.db.add.call_args[0][0]
        assert isinstance(added, MagicToken)
        assert added.email == "user@example.com"
        assert added.token_hash == "hash123"

    def test_get_magic_token_returns_matching(self):
        expected = MagicMock(spec=MagicToken)
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_magic_token("hash123")

        assert result == expected

    def test_mark_magic_token_used_sets_timestamp(self):
        mt = MagicMock(spec=MagicToken)

        self.repo.mark_magic_token_used(mt)

        assert mt.used_at is not None
        self.db.commit.assert_called_once()


    def test_invalidate_reset_tokens_deletes_and_commits(self):
        self.repo.invalidate_reset_tokens(user_id=1)

        self.db.commit.assert_called_once()

    def test_create_reset_token_persists_and_returns(self):
        expires = datetime.now(UTC) + timedelta(hours=1)

        self.repo.create_reset_token(user_id=1, token_hash="resethash", expires_at=expires)

        self.db.add.assert_called_once()
        added = self.db.add.call_args[0][0]
        assert isinstance(added, ResetToken)
        assert added.user_id == 1
        assert added.token_hash == "resethash"

    def test_get_reset_token_returns_matching(self):
        expected = MagicMock(spec=ResetToken)
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_reset_token("resethash")

        assert result == expected

    def test_mark_reset_token_used_sets_timestamp(self):
        rt = MagicMock(spec=ResetToken)

        self.repo.mark_reset_token_used(rt)

        assert rt.used_at is not None
        self.db.commit.assert_called_once()


    def test_count_documents_returns_count(self):
        self.db.query.return_value.filter.return_value.count.return_value = 7

        result = self.repo.count_documents(user_id=1)

        assert result == 7

    def test_count_queries_24h_returns_count(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = 3

        result = self.repo.count_queries_24h(user_id=1)

        assert result == 3

    def test_sum_storage_bytes_returns_integer(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = 5120

        result = self.repo.sum_storage_bytes(user_id=1)

        assert result == 5120

    def test_sum_storage_bytes_returns_zero_when_none(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = None

        result = self.repo.sum_storage_bytes(user_id=1)

        assert result == 0


class TestQuestionCountMatchesTheLimit:
    """Run against a real database: the usage meter must read the same log that the daily limit reads."""

    def test_only_this_users_questions_from_the_last_24_hours_are_counted(self):
        engine = create_engine("sqlite://")
        QueryUsageLog.__table__.create(engine)
        now = datetime.now(UTC).replace(tzinfo=None)
        with Session(engine) as session:
            session.add_all([
                QueryUsageLog(user_id=1, created_at=now),
                QueryUsageLog(user_id=1, created_at=now - timedelta(hours=23)),
                QueryUsageLog(user_id=1, created_at=now - timedelta(hours=25)),
                QueryUsageLog(user_id=2, created_at=now),
            ])
            session.commit()

            assert UserRepository(db=session).count_queries_24h(user_id=1) == 2
