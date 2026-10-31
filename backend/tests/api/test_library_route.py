from datetime import date

import pytest
from fastapi.testclient import TestClient

from src.core.dependencies import get_current_user_id
from src.main import app
from src.schemas.library import KeyDate, KeyDatesResponse
from src.services.key_dates_service import KeyDatesService


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user_id] = lambda: 1
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_the_key_dates_of_a_document_are_returned_as_json(client):
    class _Service:
        async def key_dates(self, user_id, doc_id):
            assert (user_id, doc_id) == (1, 4)
            return KeyDatesResponse(
                dates=[KeyDate(label="Lease ends", date=date(2027, 12, 31), quote="The lease ends.", page=2)]
            )

    app.dependency_overrides[KeyDatesService] = lambda: _Service()
    response = client.post("/api/v1/library/4/key-dates")

    assert response.status_code == 200
    assert response.json() == {
        "dates": [{"label": "Lease ends", "date": "2027-12-31", "timing": None, "quote": "The lease ends.", "page": 2}]
    }
