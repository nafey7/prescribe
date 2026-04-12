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
    with patch("app.api.chat.list_patients", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = [
            {
                "id": "john_doe",
                "name": "John Doe",
                "file": "patient_john_doe.md",
                "user_id": None,
            }
        ]
        response = client.get("/api/chat/patients")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "john_doe"


def test_empty_message_rejected(client):
    response = client.post(
        "/api/chat/message",
        json={"message": ""},
        headers={"X-Patient-Id": "john_doe"},
    )
    assert response.status_code == 422


def test_chat_requires_patient_header(client):
    response = client.post(
        "/api/chat/message",
        json={"message": "hello"},
    )
    assert response.status_code == 400
    assert "X-Patient-Id" in response.json().get("detail", "")


def test_chat_message_with_header(client):
    with patch("app.api.chat.process_message", new_callable=AsyncMock) as mock_proc:
        mock_proc.return_value = ChatResponse(
            message="ok",
            chat_id="c1",
            message_id="m1",
        )
        response = client.post(
            "/api/chat/message",
            json={"message": "hello"},
            headers={"X-Patient-Id": "john_doe"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["message"] == "ok"
        mock_proc.assert_called_once()
        call_kw = mock_proc.call_args.kwargs
        assert call_kw["patient_id"] == "john_doe"
