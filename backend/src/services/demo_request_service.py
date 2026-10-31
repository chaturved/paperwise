import logging
from datetime import UTC, datetime, timedelta
from typing import Protocol

from fastapi import Depends

from src.config import settings
from src.integrations.mailer import SmtpMailer
from src.models.demo_request import DemoRequest
from src.repositories.demo_request_repository import DemoRequestRepository, DemoRequestRepositoryProtocol
from src.schemas.demo_request import DemoRequestCreate
from src.schemas.user import MessageResponse

_log = logging.getLogger(__name__)

THANKS_MESSAGE = "Thanks. We'll get back to you by email."
REPEAT_WINDOW = timedelta(hours=1)


class DemoRequestServiceProtocol(Protocol):
    def submit(self, request: DemoRequestCreate) -> MessageResponse: ...


class DemoRequestService(DemoRequestServiceProtocol):
    def __init__(
        self,
        repo: DemoRequestRepositoryProtocol = Depends(DemoRequestRepository),
        mailer: SmtpMailer = Depends(SmtpMailer),
    ) -> None:
        self.repo = repo
        self.mailer = mailer

    def submit(self, request: DemoRequestCreate) -> MessageResponse:
        # A filled-in hidden field means a bot. It gets the same answer as a person, so it learns nothing.
        if request.website:
            return MessageResponse(message=THANKS_MESSAGE)

        email = request.email.lower()
        if self.repo.exists_since(email, datetime.now(UTC).replace(tzinfo=None) - REPEAT_WINDOW):
            return MessageResponse(message=THANKS_MESSAGE)

        saved = self.repo.add(
            DemoRequest(
                name=request.name.strip(),
                email=email,
                company=(request.company or "").strip() or None,
                team_size=request.team_size,
                message=(request.message or "").strip() or None,
            )
        )
        self._notify(saved)
        return MessageResponse(message=THANKS_MESSAGE)

    def _notify(self, demo_request: DemoRequest) -> None:
        """Tell us about the request. It is already saved, so a mail outage must not fail the visitor's submission."""
        if not settings.DEMO_REQUEST_NOTIFY_EMAIL:
            return
        try:
            self.mailer.send_demo_request(settings.DEMO_REQUEST_NOTIFY_EMAIL, demo_request)
        except Exception:  # noqa: BLE001
            _log.warning("Failed to send the notification for demo request %s", demo_request.id, exc_info=True)
