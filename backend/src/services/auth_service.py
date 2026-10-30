import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from fastapi import Depends, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from src.config import settings
from src.core.exceptions import BadRequestError, NotFoundError, UnauthorizedError
from src.repositories.user_repository import UserRepositoryProtocol, UserRepository
from src.schemas.user import AuthResponse, MessageResponse, TokenResponse, UserCreate, UserResponse
from src.services.token_service import (
    create_access_token,
    create_refresh_token,
    validate_refresh_token,
)
from src.services.user_service import UserServiceProtocol, UserService
from src.integrations.google_oauth import GoogleOAuth
from src.integrations.mailer import SmtpMailer
from src.utils.security import hash_password, verify_password

_log = logging.getLogger(__name__)


class AuthServiceProtocol(Protocol):
    def signup(self, user_in: UserCreate, response: Response) -> AuthResponse: ...
    def login(self, response: Response, form_data: OAuth2PasswordRequestForm) -> AuthResponse: ...
    def authorize_token(self, form_data: OAuth2PasswordRequestForm) -> TokenResponse: ...
    def refresh(self, request: Request, response: Response) -> MessageResponse: ...
    def logout(self, response: Response) -> MessageResponse: ...
    def get_me(self, user_id: int) -> UserResponse: ...
    async def google_redirect(self, request: Request) -> Any: ...
    async def google_callback(self, request: Request, response: Response) -> Any: ...
    def send_magic_link(self, email: str) -> MessageResponse: ...
    def verify_magic_link(self, token: str, response: Response) -> Any: ...
    def forgot_password(self, email: str) -> MessageResponse: ...
    def reset_password(self, token: str, new_password: str) -> MessageResponse: ...


class AuthService(AuthServiceProtocol):
    def __init__(
        self,
        repo: UserRepositoryProtocol = Depends(UserRepository),
        user_service: UserServiceProtocol = Depends(UserService),
        mailer: SmtpMailer = Depends(SmtpMailer),
        google: GoogleOAuth = Depends(GoogleOAuth),
    ):
        self.repo = repo
        self.user_service = user_service
        self.mailer = mailer
        self.google = google

    def _set_auth_cookies(self, response: Response, user_id: int) -> None:
        response.set_cookie(settings.ACCESS_TOKEN_KEY, create_access_token(user_id), httponly=True, secure=True, samesite="lax")
        response.set_cookie(settings.REFRESH_TOKEN_KEY, create_refresh_token(user_id), httponly=True, secure=True, samesite="lax")

    def signup(self, user_in: UserCreate, response: Response) -> AuthResponse:
        if self.repo.get_by_email(user_in.email):
            raise BadRequestError("An account with this email already exists")
        user = self.user_service.create_user(user_in)
        self._set_auth_cookies(response, user.id)
        try:
            self.mailer.send_welcome(user.email, user.full_name.split()[0])
        except Exception:
            _log.warning("Failed to send welcome email to %s", user.email, exc_info=True)
        return AuthResponse(user=UserResponse.model_validate(user))

    def login(self, response: Response, form_data: OAuth2PasswordRequestForm) -> AuthResponse:
        user = self.repo.get_by_email(form_data.username)
        if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
            raise UnauthorizedError("Incorrect email or password")
        self._set_auth_cookies(response, user.id)
        return AuthResponse(user=UserResponse.model_validate(user))

    def authorize_token(self, form_data: OAuth2PasswordRequestForm) -> TokenResponse:
        user = self.repo.get_by_email(form_data.username)
        if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
            raise UnauthorizedError("Incorrect email or password")
        return TokenResponse(access_token=create_access_token(user.id))

    def refresh(self, request: Request, response: Response) -> MessageResponse:
        token = request.cookies.get(settings.REFRESH_TOKEN_KEY)
        if not token:
            raise UnauthorizedError("Missing refresh token")
        user_id = validate_refresh_token(token)
        response.set_cookie(settings.ACCESS_TOKEN_KEY, create_access_token(user_id), httponly=True, secure=True, samesite="lax")
        return MessageResponse(message="Token refreshed")

    def logout(self, response: Response) -> MessageResponse:
        response.delete_cookie(settings.ACCESS_TOKEN_KEY)
        response.delete_cookie(settings.REFRESH_TOKEN_KEY)
        return MessageResponse(message="Logged out")

    def get_me(self, user_id: int) -> UserResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        return UserResponse.model_validate(user)

    # ─── Google OAuth ─────────────────────────────────────────────────────────

    async def google_redirect(self, request: Request):
        return await self.google.authorize_redirect(request)

    async def google_callback(self, request: Request, response: Response):
        try:
            google_user = await self.google.fetch_user(request)

            oauth_acct = self.repo.get_oauth_account("google", google_user.provider_user_id)
            if oauth_acct:
                user = self.repo.get_by_id(oauth_acct.user_id)
                if not user:
                    raise ValueError("OAuth account references deleted user")
            else:
                user = self.repo.get_by_email(google_user.email)
                if not user:
                    user = self.user_service.create_user_oauth(google_user.email, google_user.full_name)
                    try:
                        self.mailer.send_welcome(user.email, user.full_name.split()[0])
                    except Exception:
                        _log.warning("Failed to send welcome email to %s", user.email, exc_info=True)
                self.repo.create_oauth_account(user.id, "google", google_user.provider_user_id, None, None)

            redirect_to = settings.APP_URL + ("/onboarding" if not user.onboarding_completed else "/dashboard")
            redirect_response = RedirectResponse(redirect_to)
            self._set_auth_cookies(redirect_response, user.id)
            return redirect_response
        except Exception:
            _log.exception("Unexpected error in google_callback")
            return RedirectResponse(settings.APP_URL + "/login?error=oauth_failed")

    # ─── Magic link ───────────────────────────────────────────────────────────

    def send_magic_link(self, email: str) -> MessageResponse:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        self.repo.invalidate_magic_tokens(email)
        self.repo.create_magic_token(email, token_hash, expires_at)
        try:
            self.mailer.send_magic_link(email, raw_token)
        except Exception:
            _log.warning("Failed to send magic link email to %s", email, exc_info=True)
        return MessageResponse(message="If an account exists, a link has been sent.")

    def verify_magic_link(self, token: str, response: Response):
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        mt = self.repo.get_magic_token(token_hash)

        if not mt or mt.used_at or mt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return RedirectResponse(settings.APP_URL + "/login?error=invalid_link")

        user = self.repo.get_by_email(mt.email)
        if not user:
            return RedirectResponse(settings.APP_URL + "/login?error=no_account")

        self.repo.mark_magic_token_used(mt)
        self._set_auth_cookies(response, user.id)
        return RedirectResponse(settings.APP_URL + "/dashboard")

    # ─── Password reset ───────────────────────────────────────────────────────

    def forgot_password(self, email: str) -> MessageResponse:
        user = self.repo.get_by_email(email)
        if user:
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            self.repo.invalidate_reset_tokens(user.id)
            self.repo.create_reset_token(user.id, token_hash, expires_at)
            try:
                self.mailer.send_password_reset(email, raw_token)
            except Exception:
                _log.warning("Failed to send password reset email to %s", email, exc_info=True)
        return MessageResponse(message="If an account exists, a reset link has been sent.")

    def reset_password(self, token: str, new_password: str) -> MessageResponse:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        rt = self.repo.get_reset_token(token_hash)

        if not rt or rt.used_at or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise BadRequestError("Invalid or expired reset token")

        user = self.repo.get_by_id(rt.user_id)
        if not user:
            raise NotFoundError("User not found")

        user.hashed_password = hash_password(new_password)
        self.repo.mark_reset_token_used(rt)
        self.repo.update(user)
        return MessageResponse(message="Password updated successfully")
