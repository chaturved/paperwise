from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.core.dependencies import get_current_user, get_current_user_id
from src.core.enums import Plan
from src.core.exceptions import BadRequestError
from src.main import app
from src.services.answer_export_service import AnswerExportService, ExportedFile
from src.services.ask_service import AskService


class _FailingService:
    def __init__(self, error: Exception) -> None:
        self.error = error

    async def ask(self, *_args, **_kwargs):
        raise self.error
        yield  # makes this an async generator


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, plan=Plan.FREE)
    app.dependency_overrides[get_current_user_id] = lambda: 1
    yield TestClient(app)
    app.dependency_overrides.clear()


def _ask(client: TestClient, error: Exception) -> str:
    app.dependency_overrides[AskService] = lambda: _FailingService(error)
    return client.post("/api/v1/conversations/1/ask", json={"question": "hi"}).text


def test_a_user_facing_error_reaches_the_browser_with_its_message(client):
    body = _ask(client, BadRequestError("You have no documents yet"))

    assert "You have no documents yet" in body
    assert body.rstrip().endswith("data: [DONE]")


def test_an_unexpected_error_never_leaks_its_details(client):
    body = _ask(client, RuntimeError('connection to "db.internal:5432" refused'))

    assert "db.internal" not in body
    assert "Something went wrong" in body
    assert body.rstrip().endswith("data: [DONE]")


def test_the_cited_sources_are_sent_after_the_answer(client):
    class _Service:
        async def ask(self, *_args, **_kwargs):
            yield "meta", {"sources": []}
            yield "token", "Rent is due monthly [1]."
            yield "cited", [1]

    app.dependency_overrides[AskService] = lambda: _Service()
    body = client.post("/api/v1/conversations/1/ask", json={"question": "hi"}).text

    assert 'data: {"cited": [1]}' in body
    assert body.index('"token"') < body.index('"cited"') < body.index("[DONE]")


def test_an_exported_answer_downloads_as_a_word_file(client):
    class _Service:
        def export_docx(self, conv_id, user_id, message_id, plan):
            assert (conv_id, user_id, message_id) == (1, 1, 7)
            return ExportedFile("paperwise-answer.docx", b"PK-bytes", "application/vnd.test")

    app.dependency_overrides[AnswerExportService] = lambda: _Service()
    response = client.post("/api/v1/conversations/1/messages/7/export")

    assert response.status_code == 200
    assert response.content == b"PK-bytes"
    assert response.headers["content-type"] == "application/vnd.test"
    assert response.headers["content-disposition"] == 'attachment; filename="paperwise-answer.docx"'
