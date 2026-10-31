import pytest
from fastapi.testclient import TestClient

from src.config import settings
from src.main import create_app


def test_the_api_documentation_can_be_built():
    response = TestClient(create_app()).get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Paperwise API"
    assert "/api/v1/auth/login" in schema["paths"]
    assert "/api/v1/library/{doc_id}/complete" in schema["paths"]


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_the_documentation_is_served_when_enabled(monkeypatch, path):
    monkeypatch.setattr(settings, "DOCS_ENABLED", True)

    assert TestClient(create_app()).get(path).status_code == 200


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_the_documentation_is_not_served_when_disabled(monkeypatch, path):
    monkeypatch.setattr(settings, "DOCS_ENABLED", False)

    assert TestClient(create_app()).get(path).status_code == 404


def test_the_api_itself_still_works_when_the_documentation_is_disabled(monkeypatch):
    monkeypatch.setattr(settings, "DOCS_ENABLED", False)

    assert TestClient(create_app()).get("/internal/ping").status_code == 200
