from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.exceptions import BadRequestError, NotFoundError, UnauthorizedError
from src.integrations.google_oauth import GoogleOAuth, GoogleUser
from src.integrations.mailer import SmtpMailer
from src.repositories.user_repository import UserRepositoryProtocol
from src.services.auth_service import AuthService
from src.services.token_service import TokenServiceProtocol
from src.services.user_service import UserServiceProtocol
from src.utils.security import PasswordHasher


def _make_user(
    id=1,
    email="user@example.com",
    full_name="Test User",
    plan="free",
    hashed_password="hashed",
    onboarding_completed=False,
):
    user = MagicMock()
    user.id = id
    user.email = email
    user.full_name = full_name
    user.plan = plan
    user.hashed_password = hashed_password
    user.onboarding_completed = onboarding_completed
    return user


def _make_form(username="user@example.com", password="pass123"):
    form = MagicMock()
    form.username = username
    form.password = password
    return form


class TestAuthService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=UserRepositoryProtocol)
        self.mock_user_svc = MagicMock(spec_set=UserServiceProtocol)
        self.mock_mailer = MagicMock(spec_set=SmtpMailer)
        self.mock_google = MagicMock(spec_set=GoogleOAuth)
        self.mock_tokens = MagicMock(spec_set=TokenServiceProtocol)
        self.mock_hasher = MagicMock(spec_set=PasswordHasher)
        self.svc = AuthService(
            repo=self.mock_repo,
            user_service=self.mock_user_svc,
            mailer=self.mock_mailer,
            google=self.mock_google,
            tokens=self.mock_tokens,
            hasher=self.mock_hasher,
        )
        self.response = MagicMock()
        self.request = MagicMock()

    def test_signup_raises_when_email_already_exists(self):
        self.mock_repo.get_by_email.return_value = _make_user()

        from src.schemas.user import UserCreate

        user_in = UserCreate(email="user@example.com", password="pass123", full_name="Test")

        with pytest.raises(BadRequestError):
            self.svc.signup(user_in, self.response)

    def test_signup_creates_user_and_sets_cookies(self):
        self.mock_repo.get_by_email.return_value = None
        user = _make_user()
        self.mock_user_svc.create_user.return_value = user

        from src.schemas.user import UserCreate

        user_in = UserCreate(email="new@example.com", password="pass123", full_name="New User")

        with (
            patch.object(self.mock_tokens, "create_access_token", return_value="access"),
            patch.object(self.mock_tokens, "create_refresh_token", return_value="refresh"),
        ):
            result = self.svc.signup(user_in, self.response)

        self.mock_user_svc.create_user.assert_called_once_with(user_in)
        self.mock_mailer.send_welcome.assert_called_once_with("user@example.com", "Test")
        self.response.set_cookie.assert_called()
        assert result.user.id == 1

    def test_signup_swallows_welcome_email_failure(self):
        self.mock_repo.get_by_email.return_value = None
        self.mock_user_svc.create_user.return_value = _make_user()
        self.mock_mailer.send_welcome.side_effect = Exception("smtp down")

        from src.schemas.user import UserCreate

        user_in = UserCreate(email="new@example.com", password="pass123", full_name="New User")

        with (
            patch.object(self.mock_tokens, "create_access_token", return_value="access"),
            patch.object(self.mock_tokens, "create_refresh_token", return_value="refresh"),
        ):
            result = self.svc.signup(user_in, self.response)

        assert result.user.email == "user@example.com"

    def test_sign_in_methods_asks_for_a_password_when_the_account_has_one(self):
        self.mock_repo.get_by_email.return_value = _make_user(hashed_password="hashed")

        assert self.svc.sign_in_methods("user@example.com").has_password is True

    def test_sign_in_methods_does_not_ask_for_a_password_when_the_account_has_none(self):
        self.mock_repo.get_by_email.return_value = _make_user(hashed_password=None)

        assert self.svc.sign_in_methods("user@example.com").has_password is False

    def test_sign_in_methods_answers_the_same_for_an_unknown_email_as_for_a_password_account(self):
        self.mock_repo.get_by_email.return_value = None

        assert self.svc.sign_in_methods("nobody@example.com").has_password is True

    def test_email_exists_is_true_for_a_registered_email(self):
        self.mock_repo.get_by_email.return_value = _make_user()

        assert self.svc.email_exists("user@example.com").exists is True

    def test_email_exists_is_false_for_an_unknown_email(self):
        self.mock_repo.get_by_email.return_value = None

        assert self.svc.email_exists("nobody@example.com").exists is False

    def test_login_raises_when_user_not_found(self):
        self.mock_repo.get_by_email.return_value = None

        with pytest.raises(UnauthorizedError):
            self.svc.login(self.response, _make_form())

    def test_login_raises_when_password_wrong(self):
        self.mock_repo.get_by_email.return_value = _make_user()

        with (
            patch.object(self.mock_hasher, "verify", return_value=False),
            pytest.raises(UnauthorizedError),
        ):
            self.svc.login(self.response, _make_form())

    def test_login_success_sets_cookies(self):
        user = _make_user()
        self.mock_repo.get_by_email.return_value = user

        with (
            patch.object(self.mock_hasher, "verify", return_value=True),
            patch.object(self.mock_tokens, "create_access_token", return_value="access"),
            patch.object(self.mock_tokens, "create_refresh_token", return_value="refresh"),
        ):
            result = self.svc.login(self.response, _make_form())

        self.response.set_cookie.assert_called()
        assert result.user.id == 1

    def test_authorize_token_raises_when_credentials_wrong(self):
        self.mock_repo.get_by_email.return_value = None

        with pytest.raises(UnauthorizedError):
            self.svc.authorize_token(_make_form())

    def test_authorize_token_returns_access_token(self):
        self.mock_repo.get_by_email.return_value = _make_user()

        with (
            patch.object(self.mock_hasher, "verify", return_value=True),
            patch.object(self.mock_tokens, "create_access_token", return_value="tok123"),
        ):
            result = self.svc.authorize_token(_make_form())

        assert result.access_token == "tok123"

    def test_refresh_raises_when_cookie_missing(self):
        self.request.cookies.get.return_value = None

        with pytest.raises(UnauthorizedError):
            self.svc.refresh(self.request, self.response)

    def test_refresh_sets_new_access_token_cookie(self):
        self.request.cookies.get.return_value = "refresh-token"

        with (
            patch.object(self.mock_tokens, "validate_refresh_token", return_value=1),
            patch.object(self.mock_tokens, "create_access_token", return_value="new-access"),
        ):
            result = self.svc.refresh(self.request, self.response)

        self.response.set_cookie.assert_called_once()
        assert result.message == "Token refreshed"

    def test_logout_clears_both_cookies(self):
        result = self.svc.logout(self.response)

        assert self.response.delete_cookie.call_count == 2
        assert result.message == "Logged out"

    def test_get_me_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.get_me(user_id=99)

    def test_get_me_returns_user_response(self):
        self.mock_repo.get_by_id.return_value = _make_user()

        result = self.svc.get_me(user_id=1)

        assert result.email == "user@example.com"

    def test_send_magic_link_invalidates_old_and_creates_new(self):
        result = self.svc.send_magic_link("user@example.com")

        self.mock_mailer.send_magic_link.assert_called_once()
        self.mock_repo.invalidate_magic_tokens.assert_called_once_with("user@example.com")
        self.mock_repo.create_magic_token.assert_called_once()
        assert "sent" in result.message.lower() or "link" in result.message.lower()

    def test_send_magic_link_swallows_email_failure(self):
        self.mock_mailer.send_magic_link.side_effect = Exception("smtp")
        result = self.svc.send_magic_link("user@example.com")

        assert result.message is not None

    def test_verify_magic_link_redirects_when_token_not_found(self):
        self.mock_repo.get_magic_token.return_value = None

        result = self.svc.verify_magic_link("bad-token", self.response)

        assert "login" in result.headers["location"]
        assert "invalid_link" in result.headers["location"]

    def test_verify_magic_link_redirects_when_token_expired(self):
        mt = MagicMock()
        mt.used_at = None
        mt.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        self.mock_repo.get_magic_token.return_value = mt

        result = self.svc.verify_magic_link("expired-token", self.response)

        assert "invalid_link" in result.headers["location"]

    def test_verify_magic_link_redirects_when_no_account(self):
        mt = MagicMock()
        mt.used_at = None
        mt.expires_at = datetime.now(UTC) + timedelta(minutes=10)
        mt.email = "ghost@example.com"
        self.mock_repo.get_magic_token.return_value = mt
        self.mock_repo.get_by_email.return_value = None

        result = self.svc.verify_magic_link("valid-token", self.response)

        assert "no_account" in result.headers["location"]

    def test_verify_magic_link_success_sets_cookies_and_redirects(self):
        mt = MagicMock()
        mt.used_at = None
        mt.expires_at = datetime.now(UTC) + timedelta(minutes=10)
        mt.email = "user@example.com"
        self.mock_repo.get_magic_token.return_value = mt
        self.mock_repo.get_by_email.return_value = _make_user()

        with (
            patch.object(self.mock_tokens, "create_access_token", return_value="access"),
            patch.object(self.mock_tokens, "create_refresh_token", return_value="refresh"),
        ):
            result = self.svc.verify_magic_link("valid-token", self.response)

        self.mock_repo.mark_magic_token_used.assert_called_once_with(mt)
        assert "dashboard" in result.headers["location"]

    def test_forgot_password_returns_generic_message_when_no_account(self):
        self.mock_repo.get_by_email.return_value = None

        result = self.svc.forgot_password("nobody@example.com")

        self.mock_repo.create_reset_token.assert_not_called()
        assert result.message is not None

    def test_forgot_password_creates_token_and_sends_email(self):
        self.mock_repo.get_by_email.return_value = _make_user()

        result = self.svc.forgot_password("user@example.com")

        self.mock_mailer.send_password_reset.assert_called_once()
        self.mock_repo.invalidate_reset_tokens.assert_called_once_with(1)
        self.mock_repo.create_reset_token.assert_called_once()
        assert result.message is not None

    def test_reset_password_raises_when_token_not_found(self):
        self.mock_repo.get_reset_token.return_value = None

        with pytest.raises(BadRequestError):
            self.svc.reset_password("bad-token", "newpass123")

    def test_reset_password_raises_when_token_expired(self):
        rt = MagicMock()
        rt.used_at = None
        rt.expires_at = datetime.now(UTC) - timedelta(hours=1)
        self.mock_repo.get_reset_token.return_value = rt

        with pytest.raises(BadRequestError):
            self.svc.reset_password("expired", "newpass123")

    def test_reset_password_raises_when_user_not_found(self):
        rt = MagicMock()
        rt.used_at = None
        rt.expires_at = datetime.now(UTC) + timedelta(hours=1)
        rt.user_id = 99
        self.mock_repo.get_reset_token.return_value = rt
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.reset_password("valid-token", "newpass123")

    def test_reset_password_updates_hash_and_marks_token_used(self):
        rt = MagicMock()
        rt.used_at = None
        rt.expires_at = datetime.now(UTC) + timedelta(hours=1)
        rt.user_id = 1
        self.mock_repo.get_reset_token.return_value = rt

        user = _make_user()
        self.mock_repo.get_by_id.return_value = user

        with patch.object(self.mock_hasher, "hash", return_value="new_hashed"):
            result = self.svc.reset_password("valid-token", "newpass123")

        assert user.hashed_password == "new_hashed"
        self.mock_repo.mark_reset_token_used.assert_called_once_with(rt)
        self.mock_repo.update.assert_called_once_with(user)
        assert result.message == "Password updated successfully"


class TestAuthServiceGoogle:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=UserRepositoryProtocol)
        self.mock_user_svc = MagicMock(spec_set=UserServiceProtocol)
        self.mock_mailer = MagicMock(spec_set=SmtpMailer)
        self.mock_google = MagicMock(spec_set=GoogleOAuth)
        self.mock_tokens = MagicMock(spec_set=TokenServiceProtocol)
        self.mock_hasher = MagicMock(spec_set=PasswordHasher)
        self.mock_google.fetch_user = AsyncMock(
            return_value=GoogleUser(email="g@example.com", provider_user_id="sub-1", full_name="Goo Gle")
        )
        self.svc = AuthService(
            repo=self.mock_repo,
            user_service=self.mock_user_svc,
            mailer=self.mock_mailer,
            google=self.mock_google,
            tokens=self.mock_tokens,
            hasher=self.mock_hasher,
        )

    async def test_google_redirect_delegates_to_provider(self):
        self.mock_google.authorize_redirect = AsyncMock(return_value="redirect")
        request = MagicMock()

        assert await self.svc.google_redirect(request) == "redirect"
        self.mock_google.authorize_redirect.assert_awaited_once_with(request)

    async def test_callback_logs_in_existing_linked_account(self):
        user = _make_user(onboarding_completed=True)
        self.mock_repo.get_oauth_account.return_value = MagicMock(user_id=1)
        self.mock_repo.get_by_id.return_value = user

        with (
            patch.object(self.mock_tokens, "create_access_token", return_value="a"),
            patch.object(self.mock_tokens, "create_refresh_token", return_value="r"),
        ):
            response = await self.svc.google_callback(MagicMock(), MagicMock())

        assert response.headers["location"].endswith("/dashboard")
        self.mock_user_svc.create_user_oauth.assert_not_called()
        self.mock_mailer.send_welcome.assert_not_called()

    async def test_callback_creates_user_links_account_and_sends_welcome(self):
        self.mock_repo.get_oauth_account.return_value = None
        self.mock_repo.get_by_email.return_value = None
        self.mock_user_svc.create_user_oauth.return_value = _make_user(onboarding_completed=False)

        with (
            patch.object(self.mock_tokens, "create_access_token", return_value="a"),
            patch.object(self.mock_tokens, "create_refresh_token", return_value="r"),
        ):
            response = await self.svc.google_callback(MagicMock(), MagicMock())

        self.mock_user_svc.create_user_oauth.assert_called_once_with("g@example.com", "Goo Gle")
        self.mock_repo.create_oauth_account.assert_called_once_with(1, "google", "sub-1", None, None)
        self.mock_mailer.send_welcome.assert_called_once()
        assert response.headers["location"].endswith("/onboarding")

    async def test_callback_redirects_to_login_error_when_google_fails(self):
        self.mock_google.fetch_user = AsyncMock(side_effect=Exception("bad state"))

        response = await self.svc.google_callback(MagicMock(), MagicMock())

        assert response.headers["location"].endswith("/login?error=oauth_failed")
