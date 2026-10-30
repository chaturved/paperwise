from datetime import datetime, timezone
from collections.abc import Sequence
from typing import NamedTuple, Optional, Protocol, TypedDict

from fastapi import Depends, UploadFile

from src.core.enums import Plan
from src.core.exceptions import PlanLimitError
from src.repositories.tier_repository import TierRepositoryProtocol, TierRepository


class UploadMeta(NamedTuple):
    name: str
    size: int


class PlanLimits(TypedDict):
    max_docs: Optional[int]
    max_file_mb: int
    allowed_types: set[str]
    max_queries_day: Optional[int]
    history_days: Optional[int]


LIMITS: dict[Plan, PlanLimits] = {
    Plan.FREE: {
        "max_docs": 5,
        "max_file_mb": 10,
        "allowed_types": {"pdf", "docx", "txt", "md"},
        "max_queries_day": 20,
        "history_days": 7,
    },
    Plan.PRO: {
        "max_docs": None,
        "max_file_mb": 50,
        "allowed_types": {"pdf", "docx", "txt", "md"},
        "max_queries_day": None,
        "history_days": None,
    },
}


class TierServiceProtocol(Protocol):
    def check_upload(self, plan: Plan, files: list[UploadFile], current_doc_count: int) -> None: ...
    def check_upload_metadata(self, plan: Plan, files: Sequence[UploadMeta], current_doc_count: int) -> None: ...
    def check_and_log_ask(self, plan: Plan, user_id: int) -> None: ...
    def check_history(self, plan: Plan, created_at: datetime) -> None: ...


class TierService(TierServiceProtocol):
    def __init__(self, repo: TierRepositoryProtocol = Depends(TierRepository)):
        self.repo = repo

    def _limits(self, plan: Plan) -> PlanLimits:
        return LIMITS[plan]

    def check_upload(self, plan: Plan, files: list[UploadFile], current_doc_count: int) -> None:
        metadata = [UploadMeta(f.filename or "", f.size or 0) for f in files]
        self.check_upload_metadata(plan, metadata, current_doc_count)

    def check_upload_metadata(self, plan: Plan, files: Sequence[UploadMeta], current_doc_count: int) -> None:
        limits = self._limits(plan)
        if limits["max_docs"] is not None and current_doc_count + len(files) > limits["max_docs"]:
            raise PlanLimitError("documents")
        max_bytes = limits["max_file_mb"] * 1024 * 1024
        for f in files:
            if f.size > max_bytes:
                raise PlanLimitError("file_size")
            ext = f.name.rsplit(".", 1)[-1].lower() if "." in f.name else ""
            if ext not in limits["allowed_types"]:
                raise PlanLimitError("file_type")

    def check_and_log_ask(self, plan: Plan, user_id: int) -> None:
        limits = self._limits(plan)
        if limits["max_queries_day"] is not None and self.repo.count_queries_24h(user_id) >= limits["max_queries_day"]:
            raise PlanLimitError("queries")
        self.repo.log_query(user_id)

    def check_history(self, plan: Plan, created_at: datetime) -> None:
        limits = self._limits(plan)
        if limits["history_days"] is None:
            return
        age_days = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
        if age_days > limits["history_days"]:
            raise PlanLimitError("history")
