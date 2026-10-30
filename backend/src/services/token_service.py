from datetime import UTC, datetime, timedelta
from typing import Protocol

from fastapi import Depends

from ..config import settings
from ..core.exceptions import UnauthorizedError
from ..utils.jwt import JwtCodec


class TokenServiceProtocol(Protocol):
    def create_access_token(self, user_id: int) -> str: ...
    def create_refresh_token(self, user_id: int) -> str: ...
    def validate_access_token(self, token: str) -> int: ...
    def validate_refresh_token(self, token: str) -> int: ...


class TokenService(TokenServiceProtocol):
    def __init__(self, codec: JwtCodec = Depends(JwtCodec)) -> None:
        self.codec = codec

    def create_access_token(self, user_id: int) -> str:
        return self._create(user_id, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), settings.ACCESS_TOKEN_TYPE)

    def create_refresh_token(self, user_id: int) -> str:
        return self._create(user_id, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), settings.REFRESH_TOKEN_TYPE)

    def validate_access_token(self, token: str) -> int:
        return self._validate(token, settings.ACCESS_TOKEN_TYPE)

    def validate_refresh_token(self, token: str) -> int:
        return self._validate(token, settings.REFRESH_TOKEN_TYPE)

    def _create(self, user_id: int, expires_delta: timedelta, token_type: str) -> str:
        expire = datetime.now(UTC) + expires_delta
        claims = {"sub": str(user_id), "exp": int(expire.timestamp()), "type": token_type}
        return self.codec.encode(claims)

    def _validate(self, token: str, expected_type: str) -> int:
        payload = self.codec.decode(token)
        if payload.get("type") != expected_type:
            raise UnauthorizedError("Invalid token type")
        user_id = payload.get("sub")
        if user_id is None:
            raise UnauthorizedError("Invalid authentication token")
        return int(user_id)
