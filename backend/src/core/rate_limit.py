from fastapi import Depends, Request
from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter

from src.config import settings
from src.core.dependencies import get_current_user_id
from src.core.exceptions import TooManyRequestsError


class ClientAddress:
    def of(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if settings.TRUST_FORWARDED_FOR and forwarded:
            return forwarded.split(",")[-1].strip()
        return request.client.host if request.client else "unknown"


class RateLimit:
    _storage = MemoryStorage()
    _strategy = MovingWindowRateLimiter(_storage)
    _addresses = ClientAddress()

    def __init__(self, name: str, rule: str):
        self.name = name
        self.rule = parse(rule)

    def __call__(self, request: Request) -> None:
        self._count(self._addresses.of(request))

    def _count(self, key: str) -> None:
        if not self._strategy.hit(self.rule, self.name, key):
            raise TooManyRequestsError()

    @classmethod
    def reset(cls) -> None:
        cls._storage.reset()


class EmailRateLimit(RateLimit):
    """Counts per email address, for routes that say something about an account. It never refuses the request:
    refusing would let anyone lock a real user out of sign-in, so the route answers neutrally once it is spent."""

    def allows(self, email: str) -> bool:
        return self._strategy.hit(self.rule, self.name, f"email:{email.strip().lower()}")


class UserRateLimit(RateLimit):
    def __call__(self, request: Request, user_id: int = Depends(get_current_user_id)) -> None:
        self._count(f"user:{user_id}")
