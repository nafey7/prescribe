from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.doctor import DoctorPatientListItem, DoctorPatientListResponse


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_list_doctor_patients_ok(client):
    payload = DoctorPatientListResponse(
        patients=[
            DoctorPatientListItem(
                patient_id="p1",
                first_name="A",
                last_name="B",
                age=40,
                sex="Male",
                conditions=["HTN"],
                connected_since="2026-01-01",
                last_interaction=None,
            )
        ],
        total=1,
        skip=0,
        limit=50,
    )
    with patch(
        "app.api.doctor_patients.doctor_patients_service.get_connected_patient_list",
        new_callable=AsyncMock,
    ) as mock_list:
        mock_list.return_value = payload
        r = client.get("/api/doctors/d1/patients")
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["patients"][0]["patient_id"] == "p1"


def test_doctor_patient_profile_forbidden(client):
    with patch(
        "app.api.doctor_patients.doctor_patients_service.get_connected_patient_profile",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.side_effect = HTTPException(
            status_code=403, detail="No active connection with this patient"
        )
        r = client.get("/api/doctors/d1/patients/p2/profile")
        assert r.status_code == 403


def test_doctor_patient_medical_history_ok(client):
    with patch(
        "app.api.doctor_patients.doctor_patients_service.get_connected_patient_history",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.return_value = {
            "patient_id": "p2",
            "summary": {
                "first_name": "A",
                "last_name": "B",
                "age": 30,
                "sex": None,
                "blood_type": None,
                "weight_kg": None,
                "height_cm": None,
            },
            "conditions": [],
            "allergies": [],
            "medications": [],
            "lab_reports": [],
            "medical_events": [],
            "recent_documents": [],
            "family_history": [],
            "lifestyle": None,
        }
        r = client.get("/api/doctors/d1/patients/p2/medical-history")
        assert r.status_code == 200
        assert r.json()["summary"]["first_name"] == "A"


def test_doctor_patient_documents_list_ok(client):
    with patch(
        "app.api.doctor_patients.doctor_patients_service.list_connected_patient_documents",
        new_callable=AsyncMock,
    ) as mock_list:
        mock_list.return_value = {
            "documents": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
        }
        r = client.get("/api/doctors/d1/patients/p2/documents")
        assert r.status_code == 200
        assert r.json()["total"] == 0


def test_doctor_patient_document_download_ok(client):
    async def fake_stream():
        yield b"hello"

    with patch(
        "app.api.doctor_patients.doctor_patients_service.download_connected_patient_document",
        new_callable=AsyncMock,
    ) as mock_dl:
        mock_dl.return_value = (fake_stream(), "application/pdf", "x.pdf")
        r = client.get("/api/doctors/d1/patients/p2/documents/doc-1")
        assert r.status_code == 200
        assert r.content == b"hello"
