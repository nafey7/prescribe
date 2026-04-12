from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.medical_history import MedicalHistoryResponse, PatientSummary
from app.schemas.patient import PatientProfileResponse


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_create_patient_validation(client):
    response = client.post(
        "/api/patients",
        json={"first_name": "", "last_name": "Doe", "email": "bad"},
    )
    assert response.status_code == 422


def test_patients_for_chat_ok(client):
    with patch(
        "app.api.patients.list_chat_patients",
        new_callable=AsyncMock,
    ) as mock_list:
        mock_list.return_value = [
            {
                "id": "john_doe",
                "name": "John Doe",
                "file": "patient_john_doe.md",
                "user_id": None,
            }
        ]
        response = client.get("/api/patients/for-chat")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "john_doe"


def test_get_medical_history_ok(client):
    sample = MedicalHistoryResponse(
        patient_id="u1",
        summary=PatientSummary(first_name="John", last_name="Doe"),
        conditions=[],
        allergies=[],
        medications=[],
        lab_reports=[],
        medical_events=[],
        family_history=[],
    )
    with patch(
        "app.api.patients.medical_history_service.get_medical_history",
        new_callable=AsyncMock,
    ) as mock_gh:
        mock_gh.return_value = sample
        response = client.get("/api/patients/john_doe/medical-history")
        assert response.status_code == 200
        body = response.json()
        assert body["patient_id"] == "u1"
        assert body["summary"]["first_name"] == "John"


def test_get_medical_history_not_found(client):
    with patch(
        "app.api.patients.medical_history_service.get_medical_history",
        new_callable=AsyncMock,
    ) as mock_gh:
        from fastapi import HTTPException

        mock_gh.side_effect = HTTPException(
            status_code=404, detail="Patient not found"
        )
        response = client.get("/api/patients/nonexistent/medical-history")
        assert response.status_code == 404


def test_get_patient_not_found(client):
    with patch(
        "app.api.patients.patient_service.get_patient_profile",
        new_callable=AsyncMock,
    ) as mock_get:
        from fastapi import HTTPException

        mock_get.side_effect = HTTPException(status_code=404, detail="Patient not found")
        response = client.get("/api/patients/nonexistent-id")
        assert response.status_code == 404


def test_create_patient_success(client):
    sample = PatientProfileResponse(
        user_id="u1",
        patient_slug="john_doe",
        email="john@example.com",
        first_name="John",
        last_name="Doe",
        date_of_birth=None,
        sex="male",
        blood_type="A+",
        weight_kg=70,
        height_cm=175,
        phone=None,
        address=None,
        emergency_contact=None,
        allergies=[],
        conditions=[],
        family_history=[],
        lifestyle=None,
        created_at="2026-01-01T00:00:00",
        updated_at="2026-01-01T00:00:00",
    )
    with patch(
        "app.api.patients.patient_service.register_patient",
        new_callable=AsyncMock,
    ) as mock_reg:
        mock_reg.return_value = sample
        response = client.post(
            "/api/patients",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["user_id"] == "u1"
        assert body["email"] == "john@example.com"


def test_duplicate_email_conflict(client):
    with patch(
        "app.api.patients.patient_service.register_patient",
        new_callable=AsyncMock,
    ) as mock_reg:
        from fastapi import HTTPException

        mock_reg.side_effect = HTTPException(
            status_code=409, detail="Email already registered"
        )
        response = client.post(
            "/api/patients",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "taken@example.com",
            },
        )
        assert response.status_code == 409
