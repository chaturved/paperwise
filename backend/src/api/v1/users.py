from fastapi import APIRouter, Depends, Response

from src.config import settings
from src.core.dependencies import get_current_user_id
from src.schemas.user import DeleteAccount, PasswordChange, PasswordSet, UserUpdate
from src.services.auth_service import AuthService, AuthServiceProtocol
from src.services.user_service import UserService, UserServiceProtocol

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def me(user_id: int = Depends(get_current_user_id), service: AuthServiceProtocol = Depends(AuthService)):
    return service.get_me(user_id)


@router.patch("/me")
def update_me(
    body: UserUpdate,
    user_id: int = Depends(get_current_user_id),
    service: UserServiceProtocol = Depends(UserService),
):
    return service.update_profile(user_id, body.full_name)


@router.patch("/me/password")
def change_pw(
    body: PasswordChange,
    user_id: int = Depends(get_current_user_id),
    service: UserServiceProtocol = Depends(UserService),
):
    return service.change_password(user_id, body.current_password, body.new_password)


@router.patch("/me/password/set")
def set_pw(
    body: PasswordSet,
    user_id: int = Depends(get_current_user_id),
    service: UserServiceProtocol = Depends(UserService),
):
    return service.set_password(user_id, body.new_password)


@router.delete("/me")
def delete_me(
    body: DeleteAccount,
    response: Response,
    user_id: int = Depends(get_current_user_id),
    service: UserServiceProtocol = Depends(UserService),
):
    result = service.remove_account(user_id, body.confirmation)
    response.delete_cookie(settings.ACCESS_TOKEN_KEY)
    response.delete_cookie(settings.REFRESH_TOKEN_KEY)
    return result


@router.get("/me/usage")
def usage(user_id: int = Depends(get_current_user_id), service: UserServiceProtocol = Depends(UserService)):
    return service.get_usage(user_id)


@router.post("/me/onboarding-complete")
def onboarding_complete(
    user_id: int = Depends(get_current_user_id), service: UserServiceProtocol = Depends(UserService)
):
    return service.complete_onboarding(user_id)
