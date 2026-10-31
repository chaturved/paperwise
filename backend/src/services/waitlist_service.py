from typing import Protocol

from fastapi import Depends

from src.repositories.waitlist_repository import WaitlistRepository, WaitlistRepositoryProtocol
from src.schemas.user import MessageResponse


class WaitlistServiceProtocol(Protocol):
    def join(self, email: str) -> MessageResponse: ...


class WaitlistService(WaitlistServiceProtocol):
    def __init__(self, repo: WaitlistRepositoryProtocol = Depends(WaitlistRepository)):
        self.repo = repo

    def join(self, email: str) -> MessageResponse:
        if self.repo.exists(email):
            return MessageResponse(message="You're already on the list!")
        self.repo.add(email)
        return MessageResponse(message="You're on the list!")
