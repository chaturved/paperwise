from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.core.dependencies import get_current_user_id
from src.main import app
from src.schemas.library import DocumentFileResponse
from src.services.library_service import LibraryService


class _Service:
    def get_file_url(self, user_id: int, doc_id: int) -> DocumentFileResponse:
        self.seen = SimpleNamespace(user_id=user_id, doc_id=doc_id)
        return DocumentFileResponse(url="https://signed.example/get", expires_in=600)


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user_id] = lambda: 42
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_the_file_link_is_requested_for_the_signed_in_user(client):
    service = _Service()
    app.dependency_overrides[LibraryService] = lambda: service

    response = client.get("/api/v1/library/5/file")

    assert response.status_code == 200
    assert response.json() == {"url": "https://signed.example/get", "expires_in": 600}
    assert (service.seen.user_id, service.seen.doc_id) == (42, 5)
