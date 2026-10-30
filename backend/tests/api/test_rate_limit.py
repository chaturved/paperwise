from fastapi import Depends, FastAPI, Request
from fastapi.testclient import TestClient

from src.config import settings
from src.core.dependencies import get_current_user_id
from src.core.exception_handlers import register_exception_handlers
from src.core.rate_limit import RateLimit, UserRateLimit


def _client(limit: RateLimit) -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/ping", dependencies=[Depends(limit)])
    def ping():
        return {"ok": True}

    return TestClient(app)


def test_calls_over_the_limit_are_refused_with_429():
    client = _client(RateLimit("t-over", "2/minute"))

    assert client.get("/ping").status_code == 200
    assert client.get("/ping").status_code == 200
    refused = client.get("/ping")

    assert refused.status_code == 429
    assert refused.json()["code"] == "RATE_LIMITED"


def test_each_client_address_has_its_own_allowance(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_FORWARDED_FOR", True)
    client = _client(RateLimit("t-clients", "1/minute"))

    assert client.get("/ping", headers={"x-forwarded-for": "1.1.1.1"}).status_code == 200
    assert client.get("/ping", headers={"x-forwarded-for": "2.2.2.2"}).status_code == 200
    assert client.get("/ping", headers={"x-forwarded-for": "1.1.1.1"}).status_code == 429


def test_the_forwarded_header_is_ignored_unless_trusted():
    client = _client(RateLimit("t-untrusted", "1/minute"))

    assert client.get("/ping", headers={"x-forwarded-for": "1.1.1.1"}).status_code == 200
    assert client.get("/ping", headers={"x-forwarded-for": "2.2.2.2"}).status_code == 429


def test_the_last_forwarded_address_is_used_so_a_client_cannot_spoof_it(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_FORWARDED_FOR", True)
    client = _client(RateLimit("t-spoof", "1/minute"))

    assert client.get("/ping", headers={"x-forwarded-for": "9.9.9.1, 3.3.3.3"}).status_code == 200
    assert client.get("/ping", headers={"x-forwarded-for": "9.9.9.2, 3.3.3.3"}).status_code == 429


class _Auth:
    def login(self, response, form_data):
        return {"ok": True}


def test_the_login_route_is_limited():
    from src.main import app
    from src.services.auth_service import AuthService

    app.dependency_overrides[AuthService] = lambda: _Auth()
    try:
        client = TestClient(app)
        statuses = [client.post("/api/v1/auth/login", data={"username": "a@b.co", "password": "x"}).status_code for _ in range(11)]
    finally:
        app.dependency_overrides.clear()

    assert statuses[:10] == [200] * 10
    assert statuses[-1] == 429


def test_a_signed_in_user_keeps_one_allowance_across_addresses(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_FORWARDED_FOR", True)
    app = FastAPI()
    register_exception_handlers(app)
    limit = UserRateLimit("t-user", "1/minute")

    @app.get("/ping", dependencies=[Depends(limit)])
    def ping():
        return {"ok": True}

    users = {"a": 1, "b": 2}

    def current_user(request: Request) -> int:
        return users[request.headers["x-user"]]

    app.dependency_overrides[get_current_user_id] = current_user
    client = TestClient(app)

    assert client.get("/ping", headers={"x-user": "a", "x-forwarded-for": "1.1.1.1"}).status_code == 200
    assert client.get("/ping", headers={"x-user": "a", "x-forwarded-for": "2.2.2.2"}).status_code == 429
    assert client.get("/ping", headers={"x-user": "b", "x-forwarded-for": "1.1.1.1"}).status_code == 200
