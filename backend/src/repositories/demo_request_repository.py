from datetime import datetime
from typing import Protocol

from fastapi import Depends
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.models.demo_request import DemoRequest


class DemoRequestRepositoryProtocol(Protocol):
    def add(self, demo_request: DemoRequest) -> DemoRequest: ...
    def exists_since(self, email: str, since: datetime) -> bool: ...


class DemoRequestRepository(DemoRequestRepositoryProtocol):
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db

    def add(self, demo_request: DemoRequest) -> DemoRequest:
        self.db.add(demo_request)
        self.db.commit()
        self.db.refresh(demo_request)
        return demo_request

    def exists_since(self, email: str, since: datetime) -> bool:
        return (
            self.db.query(DemoRequest.id).filter(DemoRequest.email == email, DemoRequest.created_at >= since).first()
            is not None
        )
