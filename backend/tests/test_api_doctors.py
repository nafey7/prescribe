from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_doctors_for_dev(client):
    from app.schemas.doctor import DoctorInfo

    with patch(
        "app.service.doctor.list_doctors_for_dev", new_callable=AsyncMock
    ) as mock_list:
        mock_list.return_value = [
            DoctorInfo(id="u1", name="Dr. A", specialization="IM"),
        ]
        response = client.get("/api/doctors/for-dev")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "u1"
        assert data[0]["name"] == "Dr. A"


def test_create_doctor_validation(client):
    response = client.post(
        "/api/doctors",
        json={"first_name": "", "last_name": "Doe", "email": "bad"},
    )
    assert response.status_code == 422


def test_create_doctor_conflict(client):
    with patch(
        "app.service.doctor.register_doctor", new_callable=AsyncMock
    ) as mock_reg:
        from fastapi import HTTPException

        mock_reg.side_effect = HTTPException(status_code=409, detail="Email already registered")
        response = client.post(
            "/api/doctors",
            json={
                "first_name": "A",
                "last_name": "B",
                "email": "a@b.com",
                "specialization": "IM",
            },
        )
        assert response.status_code == 409


def test_get_doctor_not_found(client):
    with patch(
        "app.service.doctor.get_doctor_profile", new_callable=AsyncMock
    ) as mock_get:
        from fastapi import HTTPException

        mock_get.side_effect = HTTPException(status_code=404, detail="Doctor not found")
        response = client.get("/api/doctors/nonexistent-id")
        assert response.status_code == 404


def test_list_doctors_ok(client):
    with patch(
        "app.service.doctor.list_all_doctors", new_callable=AsyncMock
    ) as mock_list:
        mock_list.return_value = {
            "doctors": [],
            "total": 0,
            "skip": 0,
            "limit": 50,
        }
        response = client.get("/api/doctors")
        assert response.status_code == 200
        assert response.json()["total"] == 0


def test_doctor_echo_requires_header(client):
    response = client.get("/api/doctors/dev/echo")
    assert response.status_code == 400
    assert "X-Doctor-Id" in response.json().get("detail", "")


def test_doctor_echo_with_header(client):
    response = client.get(
        "/api/doctors/dev/echo",
        headers={"X-Doctor-Id": "usr_test_123"},
    )
    assert response.status_code == 200
    assert response.json() == {"doctor_id": "usr_test_123"}


def test_doctor_dashboard_not_found(client):
    with patch(
        "app.service.doctor_dashboard.get_doctor_dashboard", new_callable=AsyncMock
    ) as mock_dash:
        from fastapi import HTTPException

        mock_dash.side_effect = HTTPException(
            status_code=404, detail="Doctor not found"
        )
        response = client.get("/api/doctors/missing-id/dashboard")
        assert response.status_code == 404


def test_doctor_dashboard_ok(client):
    with patch(
        "app.service.doctor_dashboard.get_doctor_dashboard", new_callable=AsyncMock
    ) as mock_dash:
        from app.schemas.doctor import DashboardStats, DoctorDashboardResponse

        mock_dash.return_value = DoctorDashboardResponse(
            doctor_id="d1",
            doctor_name="Dr. A B",
            specialization="Internal Medicine",
            institution="Clinic",
            stats=DashboardStats(
                connected_patients=2,
                pending_requests=1,
                total_prescriptions=5,
            ),
            pending_requests=[],
            recent_patients=[],
            recent_activity=[],
        )
        response = client.get("/api/doctors/d1/dashboard")
        assert response.status_code == 200
        body = response.json()
        assert body["doctor_id"] == "d1"
        assert body["stats"]["connected_patients"] == 2
        assert body["stats"]["pending_requests"] == 1
        assert body["stats"]["total_prescriptions"] == 5
