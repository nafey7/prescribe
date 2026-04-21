from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chat import ChatHistoryResponse, ChatResponse, MessageSchema
from app.schemas.meal_plan import MealPlanPayload


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_doctor_chat_message_forbidden_when_not_connected(client):
    with patch(
        "app.service.doctor_chat.connection_service.verify_connection",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=403, detail="No active connection with this patient"
        ),
    ):
        r = client.post(
            "/api/doctors/dr-1/patients/pat-1/chat/message",
            json={"message": "hello"},
        )
        assert r.status_code == 403


def test_doctor_chat_message_ok_when_connected(client):
    with patch(
        "app.service.doctor_chat.connection_service.verify_connection",
        new_callable=AsyncMock,
    ):
        with patch(
            "app.service.doctor_chat.chat_service.process_message",
            new_callable=AsyncMock,
        ) as mock_proc:
            mock_proc.return_value = ChatResponse(
                message="ok",
                chat_id="c1",
                message_id="m1",
            )
            r = client.post(
                "/api/doctors/dr-1/patients/pat-1/chat/message",
                json={"message": "hello"},
            )
            assert r.status_code == 200
            body = r.json()
            assert body["message"] == "ok"
            mock_proc.assert_called_once()
            kw = mock_proc.call_args.kwargs
            assert kw["doctor_id"] == "dr-1"
            assert kw["patient_id"] == "pat-1"


def test_doctor_chat_stream_forbidden_before_stream(client):
    with patch(
        "app.api.doctor_chat.connection_service.verify_connection",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=403, detail="No active connection with this patient"
        ),
    ):
        r = client.post(
            "/api/doctors/dr-1/patients/pat-1/chat/message/stream",
            json={"message": "hello"},
        )
        assert r.status_code == 403


def test_doctor_chat_history_forbidden_wrong_doctor(client):
    with patch(
        "app.service.doctor_chat.chat_repo.get_session",
        new_callable=AsyncMock,
        return_value={
            "chat_id": "c1",
            "doctor_id": "other",
            "patient_id": "p1",
        },
    ):
        r = client.get("/api/doctors/dr-1/chat/history/c1")
        assert r.status_code == 403


def test_doctor_chat_history_ok(client):
    ts = datetime.now(timezone.utc)
    with patch(
        "app.service.doctor_chat.chat_repo.get_session",
        new_callable=AsyncMock,
        return_value={
            "chat_id": "c1",
            "doctor_id": "dr-1",
            "patient_id": "p1",
        },
    ):
        with patch(
            "app.service.doctor_chat.chat_service.get_chat_history",
            new_callable=AsyncMock,
        ) as mock_hist:
            mock_hist.return_value = ChatHistoryResponse(
                chat_id="c1",
                messages=[
                    MessageSchema(
                        role="user", content="hi", timestamp=ts
                    )
                ],
            )
            r = client.get("/api/doctors/dr-1/chat/history/c1")
            assert r.status_code == 200
            data = r.json()
            assert data["chat_id"] == "c1"
            assert len(data["messages"]) == 1


def test_doctor_chat_history_includes_meal_plan(client):
    """GET history returns message_type and nested meal_plan for assistant rows (Phase 6 contract)."""
    ts = datetime.now(timezone.utc)
    meal_plan = MealPlanPayload.model_validate(
        {
            "num_days": 1,
            "days": [
                {
                    "day_index": 1,
                    "label": "Day 1",
                    "meals": [{"name": "Oatmeal", "description": "With fruit", "items": ["oats"]}],
                }
            ],
            "summary": "Short summary",
        }
    )
    with patch(
        "app.service.doctor_chat.chat_repo.get_session",
        new_callable=AsyncMock,
        return_value={
            "chat_id": "c1",
            "doctor_id": "dr-1",
            "patient_id": "p1",
        },
    ):
        with patch(
            "app.service.doctor_chat.chat_service.get_chat_history",
            new_callable=AsyncMock,
        ) as mock_hist:
            mock_hist.return_value = ChatHistoryResponse(
                chat_id="c1",
                messages=[
                    MessageSchema(role="user", content="Plan please", timestamp=ts),
                    MessageSchema(
                        role="assistant",
                        content="Here is a plan.",
                        timestamp=ts,
                        message_type="meal_plan",
                        meal_plan=meal_plan,
                    ),
                ],
            )
            r = client.get("/api/doctors/dr-1/chat/history/c1")
            assert r.status_code == 200
            data = r.json()
            assert len(data["messages"]) == 2
            assistant = data["messages"][1]
            assert assistant["role"] == "assistant"
            assert assistant["message_type"] == "meal_plan"
            assert assistant["meal_plan"] is not None
            assert assistant["meal_plan"]["num_days"] == 1
            assert assistant["meal_plan"]["summary"] == "Short summary"
            assert len(assistant["meal_plan"]["days"]) == 1
            assert assistant["meal_plan"]["days"][0]["day_index"] == 1


def test_doctor_delete_patient_chat_forbidden_wrong_doctor(client):
    with patch(
        "app.service.doctor_chat.chat_repo.get_session",
        new_callable=AsyncMock,
        return_value={
            "chat_id": "c1",
            "doctor_id": "other",
            "patient_id": "pat-1",
        },
    ):
        with patch(
            "app.service.doctor_chat.connection_service.verify_connection",
            new_callable=AsyncMock,
        ):
            r = client.delete("/api/doctors/dr-1/patients/pat-1/chat/c1")
            assert r.status_code == 403


def test_doctor_delete_patient_chat_ok(client):
    with patch(
        "app.service.doctor_chat.chat_repo.get_session",
        new_callable=AsyncMock,
        return_value={
            "chat_id": "c1",
            "doctor_id": "dr-1",
            "patient_id": "pat-1",
        },
    ):
        with patch(
            "app.service.doctor_chat.connection_service.verify_connection",
            new_callable=AsyncMock,
        ):
            with patch(
                "app.service.doctor_chat.chat_repo.delete_session_and_messages",
                new_callable=AsyncMock,
            ) as mock_del:
                r = client.delete("/api/doctors/dr-1/patients/pat-1/chat/c1")
                assert r.status_code == 204
                mock_del.assert_called_once()
