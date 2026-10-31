from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.config import settings
from src.core.exceptions import UnauthorizedError
from src.database.db import get_db
from src.models.user import User
from src.services.token_service import TokenService, TokenServiceProtocol

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


def get_current_user_id(
    request: Request,
    bearer: str = Depends(oauth2_scheme),
    tokens: TokenServiceProtocol = Depends(TokenService),
) -> int:
    token = bearer or request.cookies.get(settings.ACCESS_TOKEN_KEY)
    if not token:
        raise UnauthorizedError("Not authenticated")
    return tokens.validate_access_token(token)


def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise UnauthorizedError()
    return user
