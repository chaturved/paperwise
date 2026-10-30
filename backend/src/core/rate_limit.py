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
    """A route dependency that allows a client a fixed number of calls in a time window.

    Counts live in memory and are shared by every `RateLimit`, so they are per server process.
    """

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


class UserRateLimit(RateLimit):
    """Like `RateLimit`, but counts per signed-in user, so switching address does not reset the allowance."""

    def __call__(self, request: Request, user_id: int = Depends(get_current_user_id)) -> None:
        self._count(f"user:{user_id}")
