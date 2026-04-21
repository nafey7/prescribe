"""Doctor and patient HTTP APIs for meal plan PDF and shares (phases 3–4)."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.meal_plan import MealPlanPayload
from app.schemas.meal_plan_share import MealPlanShareListResponse, MealPlanShareResponse


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _sample_meal_plan() -> MealPlanPayload:
    return MealPlanPayload.model_validate(
        {
            "num_days": 1,
            "days": [
                {
                    "day_index": 1,
                    "label": "Day 1",
                    "meals": [
                        {
                            "name": "Oatmeal",
                            "description": "",
                            "items": ["oats"],
                        }
                    ],
                }
            ],
            "summary": "Balanced week",
        }
    )


def test_doctor_meal_plan_pdf_forbidden_when_not_connected(client):
    with patch(
        "app.service.meal_plan_share.connection_service.verify_connection",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=403, detail="No active connection with this patient"
        ),
    ):
        r = client.get(
            "/api/doctors/dr-1/patients/pat-1/chat/meal-plan/pdf",
            params={"chat_id": "c1", "message_id": "m1"},
        )
        assert r.status_code == 403


def test_doctor_meal_plan_pdf_ok(client):
    mp = _sample_meal_plan()
    with patch(
        "app.service.meal_plan_share.connection_service.verify_connection",
        new_callable=AsyncMock,
    ):
        with patch(
            "app.service.meal_plan_share.chat_repo.get_session",
            new_callable=AsyncMock,
            return_value={
                "chat_id": "c1",
                "doctor_id": "dr-1",
                "patient_id": "pat-1",
                "title": "Nutrition chat",
            },
        ):
            with patch(
                "app.service.meal_plan_share.chat_repo.get_message",
                new_callable=AsyncMock,
                return_value={
                    "message_type": "meal_plan",
                    "meal_plan": mp.model_dump(),
                },
            ):
                with patch(
                    "app.service.meal_plan_share.doctor_repo.get_doctor",
                    new_callable=AsyncMock,
                    return_value=None,
                ):
                    r = client.get(
                        "/api/doctors/dr-1/patients/pat-1/chat/meal-plan/pdf",
                        params={"chat_id": "c1", "message_id": "m1"},
                    )
                    assert r.status_code == 200
                    assert r.headers.get("content-type", "").startswith(
                        "application/pdf"
                    )
                    assert r.content[:4] == b"%PDF"


def test_doctor_create_meal_plan_share_201(client):
    mp = _sample_meal_plan()
    ts = datetime.now(timezone.utc)
    body = MealPlanShareResponse(
        share_id="share-new",
        patient_id="pat-1",
        doctor_id="dr-1",
        meal_plan=mp,
        source_chat_id="c1",
        source_message_id="m1",
        chat_title="T",
        doctor_display_name="Dr. A",
        created_at=ts,
        revoked_at=None,
    )
    with patch(
        "app.api.doctor_chat.meal_plan_share_service.doctor_create_share",
        new_callable=AsyncMock,
        return_value=(body, True),
    ) as mock_create:
        r = client.post(
            "/api/doctors/dr-1/patients/pat-1/meal-plan-shares",
            json={"chat_id": "c1", "message_id": "m1"},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["share_id"] == "share-new"
        mock_create.assert_awaited_once()


def test_doctor_create_meal_plan_share_idempotent_200(client):
    mp = _sample_meal_plan()
    ts = datetime.now(timezone.utc)
    body = MealPlanShareResponse(
        share_id="share-existing",
        patient_id="pat-1",
        doctor_id="dr-1",
        meal_plan=mp,
        source_chat_id="c1",
        source_message_id="m1",
        created_at=ts,
        revoked_at=None,
    )
    with patch(
        "app.api.doctor_chat.meal_plan_share_service.doctor_create_share",
        new_callable=AsyncMock,
        return_value=(body, False),
    ):
        r = client.post(
            "/api/doctors/dr-1/patients/pat-1/meal-plan-shares",
            json={"chat_id": "c1", "message_id": "m1"},
        )
        assert r.status_code == 200


def test_patient_list_meal_plan_shares_ok(client):
    listing = MealPlanShareListResponse(
        items=[],
        total=0,
        skip=0,
        limit=50,
    )
    with patch(
        "app.api.patients.meal_plan_share_service.patient_list_shares",
        new_callable=AsyncMock,
        return_value=listing,
    ) as mock_list:
        r = client.get("/api/patients/pat-1/meal-plan-shares")
        assert r.status_code == 200
    mock_list.assert_awaited_once()
    assert mock_list.await_args.kwargs["patient_ids"] == ["pat-1"]


def test_patient_meal_plan_share_pdf_ok(client):
    with patch(
        "app.api.patients.meal_plan_share_service.patient_share_pdf_bytes",
        new_callable=AsyncMock,
        return_value=b"%PDF-1.4 unit-test",
    ):
        r = client.get(
            "/api/patients/pat-1/meal-plan-shares/share-abc/pdf",
        )
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")
