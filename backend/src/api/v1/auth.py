from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from src.core.dependencies import get_current_user_id
from src.core.rate_limit import EmailRateLimit, RateLimit
from src.schemas.user import (
    EmailExistsResponse,
    ForgotPasswordRequest,
    MagicLinkRequest,
    ResetPasswordRequest,
    SignInMethodsRequest,
    SignInMethodsResponse,
    UserCreate,
)
from src.services.auth_service import AuthService, AuthServiceProtocol

router = APIRouter(prefix="/auth", tags=["Auth"])

sign_in_limit = RateLimit("sign-in", "10/minute")
sign_up_limit = RateLimit("sign-up", "5/minute")
token_limit = RateLimit("auth-token", "10/minute")
email_limit = RateLimit("auth-email", "5/minute")
methods_limit = RateLimit("auth-methods", "10/minute")
methods_email_limit = EmailRateLimit("auth-methods-email", "10/hour")
email_exists_email_limit = EmailRateLimit("auth-email-exists-email", "10/hour")


@router.post("/signup", dependencies=[Depends(sign_up_limit)])
def signup_route(user_in: UserCreate, response: Response, service: AuthServiceProtocol = Depends(AuthService)):
    return service.signup(user_in, response)


@router.post("/login", dependencies=[Depends(sign_in_limit)])
def login_route(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthServiceProtocol = Depends(AuthService),
):
    return service.login(response, form_data)


@router.post("/email-exists", response_model=EmailExistsResponse, dependencies=[Depends(methods_limit)])
def email_exists_route(body: SignInMethodsRequest, service: AuthServiceProtocol = Depends(AuthService)):
    if not email_exists_email_limit.allows(body.email):
        return EmailExistsResponse(exists=False)
    return service.email_exists(body.email)


@router.post("/methods", response_model=SignInMethodsResponse, dependencies=[Depends(methods_limit)])
def sign_in_methods_route(body: SignInMethodsRequest, service: AuthServiceProtocol = Depends(AuthService)):
    if not methods_email_limit.allows(body.email):
        return SignInMethodsResponse(has_password=True)
    return service.sign_in_methods(body.email)


@router.post("/token", include_in_schema=False, dependencies=[Depends(sign_in_limit)])
def token_route(form_data: OAuth2PasswordRequestForm = Depends(), service: AuthServiceProtocol = Depends(AuthService)):
    return service.authorize_token(form_data)


@router.post("/logout")
def logout_route(response: Response, service: AuthServiceProtocol = Depends(AuthService)):
    return service.logout(response)


@router.post("/refresh")
def refresh_route(request: Request, response: Response, service: AuthServiceProtocol = Depends(AuthService)):
    return service.refresh(request, response)


@router.get("/me")
def me_route(user_id: int = Depends(get_current_user_id), service: AuthServiceProtocol = Depends(AuthService)):
    return service.get_me(user_id)


@router.get("/google")
async def google_login(request: Request, service: AuthServiceProtocol = Depends(AuthService)):
    return await service.google_redirect(request)


@router.get("/google/callback")
async def google_cb(request: Request, response: Response, service: AuthServiceProtocol = Depends(AuthService)):
    return await service.google_callback(request, response)


@router.post("/magic-link", dependencies=[Depends(email_limit)])
def magic_link(body: MagicLinkRequest, service: AuthServiceProtocol = Depends(AuthService)):
    return service.send_magic_link(body.email)


@router.get("/magic-link/verify", dependencies=[Depends(token_limit)])
def magic_link_verify(token: str, response: Response, service: AuthServiceProtocol = Depends(AuthService)):
    return service.verify_magic_link(token, response)


@router.post("/forgot-password", dependencies=[Depends(email_limit)])
def forgot_pw(body: ForgotPasswordRequest, service: AuthServiceProtocol = Depends(AuthService)):
    return service.forgot_password(body.email)


@router.post("/reset-password", dependencies=[Depends(token_limit)])
def reset_pw(body: ResetPasswordRequest, service: AuthServiceProtocol = Depends(AuthService)):
    return service.reset_password(body.token, body.new_password)
