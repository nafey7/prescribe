from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chat import ChatResponse


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_patients(client):
    with patch("app.api.chat.list_patients") as mock_list:
        mock_list.return_value = [
            {"id": "john_doe", "name": "John Doe", "file": "patient_john_doe.md"}
        ]
        response = client.get("/api/chat/patients")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "john_doe"


def test_empty_message_rejected(client):
    response = client.post(
        "/api/chat/message",
        json={"message": "", "patient_id": "john_doe"},
    )
    assert response.status_code == 422
