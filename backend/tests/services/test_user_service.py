from unittest.mock import MagicMock, patch

import pytest

from src.core.enums import Plan
from src.core.exceptions import BadRequestError, NotFoundError, UnprocessableEntityError
from src.repositories.user_repository import UserRepositoryProtocol
from src.schemas.user import UserCreate
from src.services.user_service import UserService
from src.utils.security import PasswordHasher


def _make_user(id=1, email="user@example.com", full_name="Test User", plan=Plan.FREE):
    user = MagicMock()
    user.id = id
    user.email = email
    user.full_name = full_name
    user.plan = plan
    user.hashed_password = "hashed"
    user.onboarding_completed = False
    return user


class TestUserService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=UserRepositoryProtocol)
        self.mock_hasher = MagicMock(spec_set=PasswordHasher)
        self.svc = UserService(repo=self.mock_repo, hasher=self.mock_hasher)

    # ── create_user ───────────────────────────────────────────────────────────

    def test_create_user_hashes_password(self):
        user_in = UserCreate(email="a@b.com", password="secret123", full_name="John Doe")
        self.mock_repo.add.return_value = _make_user(email="a@b.com", full_name="John Doe")

        with patch.object(self.mock_hasher, "hash", return_value="hashed") as mock_hash:
            self.svc.create_user(user_in)

        mock_hash.assert_called_once_with("secret123")
        self.mock_repo.add.assert_called_once()
        added = self.mock_repo.add.call_args[0][0]
        assert added.hashed_password == "hashed"

    # ── create_user_oauth ─────────────────────────────────────────────────────

    def test_create_user_oauth_sets_no_password(self):
        self.mock_repo.add.return_value = _make_user()

        self.svc.create_user_oauth(email="a@b.com", full_name="John Doe")

        added = self.mock_repo.add.call_args[0][0]
        assert added.hashed_password is None

    # ── update_profile ────────────────────────────────────────────────────────

    def test_update_profile_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.update_profile(user_id=1, full_name="New Name")

    def test_update_profile_updates_name_and_initials(self):
        user = _make_user(full_name="Old Name")
        self.mock_repo.get_by_id.return_value = user
        self.mock_repo.update.return_value = user

        self.svc.update_profile(user_id=1, full_name="Jane Smith")

        assert user.full_name == "Jane Smith"
        self.mock_repo.update.assert_called_once_with(user)

    # ── change_password ───────────────────────────────────────────────────────

    def test_change_password_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.change_password(user_id=1, current_password="old", new_password="newpass1")

    def test_change_password_raises_when_wrong_current(self):
        user = _make_user()
        self.mock_repo.get_by_id.return_value = user

        with (
            patch.object(self.mock_hasher, "verify", return_value=False),
            pytest.raises(BadRequestError),
        ):
            self.svc.change_password(user_id=1, current_password="wrong", new_password="newpass1")

    def test_change_password_raises_when_too_short(self):
        user = _make_user()
        self.mock_repo.get_by_id.return_value = user

        with (
            patch.object(self.mock_hasher, "verify", return_value=True),
            pytest.raises(UnprocessableEntityError),
        ):
            self.svc.change_password(user_id=1, current_password="old", new_password="short")

    def test_change_password_success(self):
        user = _make_user()
        self.mock_repo.get_by_id.return_value = user

        with (
            patch.object(self.mock_hasher, "verify", return_value=True),
            patch.object(self.mock_hasher, "hash", return_value="new_hashed"),
        ):
            result = self.svc.change_password(user_id=1, current_password="old", new_password="newpass123")

        assert user.hashed_password == "new_hashed"
        self.mock_repo.update.assert_called_once_with(user)
        assert result.message == "Password updated"

    # ── set_password ──────────────────────────────────────────────────────────

    def test_set_password_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.set_password(user_id=1, new_password="newpass1")

    def test_set_password_raises_when_too_short(self):
        self.mock_repo.get_by_id.return_value = _make_user()

        with pytest.raises(UnprocessableEntityError):
            self.svc.set_password(user_id=1, new_password="short")

    def test_set_password_success(self):
        user = _make_user()
        self.mock_repo.get_by_id.return_value = user

        with patch.object(self.mock_hasher, "hash", return_value="hashed_new"):
            result = self.svc.set_password(user_id=1, new_password="newpass123")

        assert user.hashed_password == "hashed_new"
        assert result.message == "Password set"

    # ── remove_account ────────────────────────────────────────────────────────

    def test_remove_account_raises_on_wrong_confirmation(self):
        with pytest.raises(BadRequestError):
            self.svc.remove_account(user_id=1, confirmation="delete")

    def test_remove_account_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.remove_account(user_id=1, confirmation="DELETE")

    def test_remove_account_deletes_user(self):
        user = _make_user()
        self.mock_repo.get_by_id.return_value = user

        result = self.svc.remove_account(user_id=1, confirmation="DELETE")

        self.mock_repo.delete.assert_called_once_with(user)
        assert result.message == "Account deleted"

    # ── complete_onboarding ───────────────────────────────────────────────────

    def test_complete_onboarding_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.complete_onboarding(user_id=1)

    def test_complete_onboarding_sets_flag(self):
        user = _make_user()
        user.onboarding_completed = False
        self.mock_repo.get_by_id.return_value = user

        result = self.svc.complete_onboarding(user_id=1)

        assert user.onboarding_completed is True
        self.mock_repo.update.assert_called_once_with(user)
        assert result.message == "Onboarding complete"

    # ── get_usage ─────────────────────────────────────────────────────────────

    def test_get_usage_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.get_usage(user_id=1)

    def test_get_usage_free_plan_returns_limits(self):
        user = _make_user(plan=Plan.FREE)
        self.mock_repo.get_by_id.return_value = user
        self.mock_repo.count_documents.return_value = 2
        self.mock_repo.count_queries_today.return_value = 5
        self.mock_repo.sum_storage_bytes.return_value = 1024

        result = self.svc.get_usage(user_id=1)

        assert result.documents.used == 2
        assert result.documents.limit == 5  # FREE max_docs
        assert result.queries_today.used == 5
        assert result.queries_today.limit == 20  # FREE max_queries_day
        assert result.storage_bytes.used == 1024
        assert result.storage_bytes.limit == 10 * 1024 * 1024  # 10MB

    def test_get_usage_pro_plan_has_no_doc_limit(self):
        user = _make_user(plan=Plan.PRO)
        self.mock_repo.get_by_id.return_value = user
        self.mock_repo.count_documents.return_value = 100
        self.mock_repo.count_queries_today.return_value = 500
        self.mock_repo.sum_storage_bytes.return_value = 0

        result = self.svc.get_usage(user_id=1)

        assert result.documents.limit is None
        assert result.queries_today.limit is None
