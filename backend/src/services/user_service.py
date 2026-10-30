from typing import Protocol

from fastapi import Depends

from src.core.exceptions import BadRequestError, NotFoundError, UnprocessableEntityError
from src.models.user import User
from src.repositories.user_repository import UserRepository, UserRepositoryProtocol
from src.schemas.user import MessageResponse, ProfileResponse, UsageItemResponse, UsageResponse, UserCreate
from src.services.tier_service import LIMITS
from src.utils.security import PasswordHasher


class UserServiceProtocol(Protocol):
    def create_user(self, user_in: UserCreate) -> User: ...
    def create_user_oauth(self, email: str, full_name: str) -> User: ...
    def update_profile(self, user_id: int, full_name: str) -> ProfileResponse: ...
    def change_password(self, user_id: int, current_password: str, new_password: str) -> MessageResponse: ...
    def set_password(self, user_id: int, new_password: str) -> MessageResponse: ...
    def remove_account(self, user_id: int, confirmation: str) -> MessageResponse: ...
    def complete_onboarding(self, user_id: int) -> MessageResponse: ...
    def get_usage(self, user_id: int) -> UsageResponse: ...


class UserService(UserServiceProtocol):
    def __init__(
        self,
        repo: UserRepositoryProtocol = Depends(UserRepository),
        hasher: PasswordHasher = Depends(PasswordHasher),
    ):
        self.repo = repo
        self.hasher = hasher

    def create_user(self, user_in: UserCreate) -> User:
        user = User(
            email=user_in.email,
            hashed_password=self.hasher.hash(user_in.password),
            full_name=user_in.full_name,
        )
        return self.repo.add(user)

    def create_user_oauth(self, email: str, full_name: str) -> User:
        user = User(
            email=email,
            hashed_password=None,
            full_name=full_name,
        )
        return self.repo.add(user)

    def update_profile(self, user_id: int, full_name: str) -> ProfileResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        user.full_name = full_name
        self.repo.update(user)
        return ProfileResponse.model_validate(user)

    def change_password(self, user_id: int, current_password: str, new_password: str) -> MessageResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        if not user.hashed_password or not self.hasher.verify(current_password, user.hashed_password):
            raise BadRequestError("Current password is incorrect")
        if len(new_password) < 8:
            raise UnprocessableEntityError("Password must be at least 8 characters")
        user.hashed_password = self.hasher.hash(new_password)
        self.repo.update(user)
        return MessageResponse(message="Password updated")

    def set_password(self, user_id: int, new_password: str) -> MessageResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        if len(new_password) < 8:
            raise UnprocessableEntityError("Password must be at least 8 characters")
        user.hashed_password = self.hasher.hash(new_password)
        self.repo.update(user)
        return MessageResponse(message="Password set")

    def remove_account(self, user_id: int, confirmation: str) -> MessageResponse:
        if confirmation != "DELETE":
            raise BadRequestError("Type DELETE to confirm")
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        self.repo.delete(user)
        return MessageResponse(message="Account deleted")

    def complete_onboarding(self, user_id: int) -> MessageResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        user.onboarding_completed = True
        self.repo.update(user)
        return MessageResponse(message="Onboarding complete")

    def get_usage(self, user_id: int) -> UsageResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        limits = LIMITS[user.plan]
        max_bytes = limits["max_file_mb"] * 1024 * 1024 if limits["max_file_mb"] else None
        return UsageResponse(
            documents=UsageItemResponse(used=self.repo.count_documents(user_id), limit=limits["max_docs"]),
            queries_today=UsageItemResponse(used=self.repo.count_queries_today(user_id), limit=limits["max_queries_day"]),
            storage_bytes=UsageItemResponse(used=self.repo.sum_storage_bytes(user_id), limit=max_bytes),
        )
