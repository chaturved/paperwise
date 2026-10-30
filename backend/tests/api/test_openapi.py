from fastapi.testclient import TestClient


def test_the_api_documentation_can_be_built():
    from src.main import app

    response = TestClient(app).get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Paperwise API"
    assert "/api/v1/auth/login" in schema["paths"]
    assert "/api/v1/library/{doc_id}/complete" in schema["paths"]
