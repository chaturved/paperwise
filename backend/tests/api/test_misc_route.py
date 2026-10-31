import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.schemas.user import MessageResponse
from src.services.demo_request_service import DemoRequestService


class _Service:
    def __init__(self) -> None:
        self.received = None

    def submit(self, request):
        self.received = request
        return MessageResponse(message="Thanks. We'll get back to you by email.")


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_a_demo_request_reaches_the_service(client):
    service = _Service()
    app.dependency_overrides[DemoRequestService] = lambda: service

    response = client.post(
        "/api/v1/demo-requests", json={"name": "Sam", "email": "sam@example.com", "team_size": "solo"}
    )

    assert response.status_code == 200
    assert service.received.email == "sam@example.com"


def test_a_demo_request_without_a_valid_email_is_refused(client):
    app.dependency_overrides[DemoRequestService] = lambda: _Service()

    assert client.post("/api/v1/demo-requests", json={"name": "Sam", "email": "nope"}).status_code == 422
