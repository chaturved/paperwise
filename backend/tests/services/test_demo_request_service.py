from unittest.mock import MagicMock

import pytest

from src.config import settings
from src.integrations.mailer import SmtpMailer
from src.repositories.demo_request_repository import DemoRequestRepositoryProtocol
from src.schemas.demo_request import DemoRequestCreate
from src.services.demo_request_service import THANKS_MESSAGE, DemoRequestService


def _request(**overrides) -> DemoRequestCreate:
    fields = {
        "name": "Sam Rivera",
        "email": "Sam@Example.com",
        "company": "Rivera Design",
        "team_size": "2-10",
        "message": "Contracts",
    }
    return DemoRequestCreate(**{**fields, **overrides})


class TestDemoRequestService:
    @pytest.fixture(autouse=True)
    def setup(self, monkeypatch) -> None:
        monkeypatch.setattr(settings, "DEMO_REQUEST_NOTIFY_EMAIL", "team@paperwise.ai")
        self.repo = MagicMock(spec_set=DemoRequestRepositoryProtocol)
        self.repo.exists_since.return_value = False
        self.repo.add.side_effect = lambda demo_request: demo_request
        self.mailer = MagicMock(spec_set=SmtpMailer)
        self.svc = DemoRequestService(repo=self.repo, mailer=self.mailer)

    def test_saves_the_request_with_a_lowercase_email_and_says_thanks(self):
        result = self.svc.submit(_request())

        saved = self.repo.add.call_args.args[0]
        assert (saved.name, saved.email, saved.company, saved.team_size, saved.message) == (
            "Sam Rivera",
            "sam@example.com",
            "Rivera Design",
            "2-10",
            "Contracts",
        )
        assert result.message == THANKS_MESSAGE

    def test_blank_optional_fields_are_stored_as_empty(self):
        self.svc.submit(_request(company="   ", message="  "))

        saved = self.repo.add.call_args.args[0]
        assert saved.company is None and saved.message is None

    def test_emails_the_team_when_a_notification_address_is_set(self):
        self.svc.submit(_request())

        self.mailer.send_demo_request.assert_called_once()
        assert self.mailer.send_demo_request.call_args.args[0] == "team@paperwise.ai"

    def test_only_saves_the_request_when_no_notification_address_is_set(self, monkeypatch):
        monkeypatch.setattr(settings, "DEMO_REQUEST_NOTIFY_EMAIL", "")

        self.svc.submit(_request())

        self.repo.add.assert_called_once()
        self.mailer.send_demo_request.assert_not_called()

    def test_a_mail_outage_does_not_fail_the_submission(self):
        self.mailer.send_demo_request.side_effect = OSError("smtp down")

        result = self.svc.submit(_request())

        self.repo.add.assert_called_once()
        assert result.message == THANKS_MESSAGE

    def test_a_filled_hidden_field_is_a_bot_and_is_dropped_without_a_clue(self):
        result = self.svc.submit(_request(website="http://spam.example"))

        self.repo.add.assert_not_called()
        self.mailer.send_demo_request.assert_not_called()
        assert result.message == THANKS_MESSAGE

    def test_the_same_email_twice_within_the_hour_is_stored_once(self):
        self.repo.exists_since.return_value = True

        result = self.svc.submit(_request())

        self.repo.add.assert_not_called()
        assert result.message == THANKS_MESSAGE
        assert self.repo.exists_since.call_args.args[0] == "sam@example.com"


class TestDemoRequestSchema:
    def test_a_line_break_in_the_name_cannot_survive(self):
        assert _request(name="Sam\r\nBcc: someone@else.com").name == "Sam Bcc: someone@else.com"

    @pytest.mark.parametrize(
        "field,value", [("name", ""), ("name", "x" * 121), ("message", "x" * 2001), ("team_size", "500")]
    )
    def test_bad_values_are_refused(self, field, value):
        with pytest.raises(ValueError):
            _request(**{field: value})
