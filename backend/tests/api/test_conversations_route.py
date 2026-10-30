from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.core.dependencies import get_current_user
from src.core.enums import Plan
from src.core.exceptions import BadRequestError
from src.main import app
from src.services.conversation_service import ConversationService


class _FailingService:
    def __init__(self, error: Exception) -> None:
        self.error = error

    async def ask(self, *_args, **_kwargs):
        raise self.error
        yield  # makes this an async generator


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, plan=Plan.FREE)
    yield TestClient(app)
    app.dependency_overrides.clear()


def _ask(client: TestClient, error: Exception) -> str:
    app.dependency_overrides[ConversationService] = lambda: _FailingService(error)
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

    app.dependency_overrides[ConversationService] = lambda: _Service()
    body = client.post("/api/v1/conversations/1/ask", json={"question": "hi"}).text

    assert 'data: {"cited": [1]}' in body
    assert body.index('"token"') < body.index('"cited"') < body.index("[DONE]")
