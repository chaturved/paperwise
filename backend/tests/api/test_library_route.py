from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from src.core.dependencies import get_current_user_id
from src.main import app
from src.schemas.library import DocumentFileResponse, KeyDate, KeyDatesResponse
from src.services.key_dates_service import KeyDatesService
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


def test_the_key_dates_of_a_document_are_returned_as_json(client):
    class _KeyDates:
        async def key_dates(self, user_id, doc_id):
            assert (user_id, doc_id) == (42, 4)
            return KeyDatesResponse(
                dates=[KeyDate(label="Lease ends", date=date(2027, 12, 31), quote="The lease ends.", page=2)]
            )

    app.dependency_overrides[KeyDatesService] = lambda: _KeyDates()
    response = client.post("/api/v1/library/4/key-dates")

    assert response.status_code == 200
    assert response.json() == {
        "dates": [{"label": "Lease ends", "date": "2027-12-31", "timing": None, "quote": "The lease ends.", "page": 2}]
    }
