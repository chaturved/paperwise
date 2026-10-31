from jose import ExpiredSignatureError, JWTError, jwt

from ..config import settings
from ..core.exceptions import UnauthorizedError


class JwtCodec:
    def encode(self, claims: dict) -> str:
        return jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def decode(self, token: str) -> dict:
        try:
            return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except ExpiredSignatureError:
            raise UnauthorizedError("Token has expired")
        except JWTError:
            raise UnauthorizedError("Could not validate credentials")
