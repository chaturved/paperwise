from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from src.core.enums import Plan
from src.core.exceptions import BadRequestError, NotFoundError
from src.repositories.conversation_repository import ConversationRepositoryProtocol
from src.services.answer_export_service import DOCX_MEDIA_TYPE, AnswerExportService
from src.services.tier_service import TierServiceProtocol


def _message(id: int, parent_id: int | None, role: str, content: str, meta: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(id=id, parent_id=parent_id, role=role, content=content, meta=meta)


class TestAnswerExportService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.tier = MagicMock(spec_set=TierServiceProtocol)
        self.writer = MagicMock()
        self.writer.write.return_value = b"docx-bytes"
        self.conv = SimpleNamespace(id=1, created_at=datetime.now(UTC))
        self.repo.get_by_id.return_value = self.conv
        self.repo.get_messages.return_value = [
            _message(1, None, "user", "What is the rent?"),
            _message(2, 1, "assistant", "It is $900 [1].", {"sources": [{"n": 1, "name": "lease.pdf"}]}),
            _message(3, 2, "user", "And the deposit?"),
            _message(4, 3, "assistant", "Something went wrong.", {"failed": True}),
        ]
        self.svc = AnswerExportService(conv_repo=self.repo, tier=self.tier, writer=self.writer)

    def test_the_answer_is_exported_with_its_question_and_cited_sources(self):
        file = self.svc.export_docx(1, 1, 2, Plan.FREE)

        self.writer.write.assert_called_once_with(
            "What is the rent?", "It is $900 [1].", [{"n": 1, "name": "lease.pdf"}]
        )
        assert (file.filename, file.content, file.media_type) == (
            "paperwise-answer.docx",
            b"docx-bytes",
            DOCX_MEDIA_TYPE,
        )

    def test_the_plans_history_limit_applies(self):
        self.svc.export_docx(1, 1, 2, Plan.FREE)

        self.tier.check_history.assert_called_once_with(Plan.FREE, self.conv.created_at)

    def test_a_conversation_that_is_not_the_users_is_not_found(self):
        self.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.export_docx(1, 1, 2, Plan.FREE)

    def test_a_question_cannot_be_exported_as_an_answer(self):
        with pytest.raises(NotFoundError):
            self.svc.export_docx(1, 1, 1, Plan.FREE)

    def test_a_message_from_another_conversation_is_not_found(self):
        with pytest.raises(NotFoundError):
            self.svc.export_docx(1, 1, 99, Plan.FREE)

    def test_an_answer_that_failed_cannot_be_exported(self):
        with pytest.raises(BadRequestError):
            self.svc.export_docx(1, 1, 4, Plan.FREE)
