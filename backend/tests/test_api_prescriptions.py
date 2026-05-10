"""HTTP-level tests for the prescriptions API, including check-interactions.

Run via the backend container:
    docker compose exec backend python -m pytest tests/test_api_prescriptions.py -v
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.drug_interaction import DrugInteraction, DrugInteractionCheckResponse


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


DOCTOR_ID = "doctor-abc"
PATIENT_ID = "patient-xyz"
BASE_URL = f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/prescriptions"


def _interaction_response(interactions: list[dict] | None = None) -> DrugInteractionCheckResponse:
    return DrugInteractionCheckResponse(
        interactions=[DrugInteraction(**i) for i in (interactions or [])],
        checked_at="2026-05-10T00:00:00Z",
    )


class TestCheckInteractionsEndpoint:
    def test_returns_200_with_interactions(self, client):
        with patch(
            "app.api.prescriptions.drug_interaction_service.check_interactions",
            new_callable=AsyncMock,
            return_value=_interaction_response(
                [
                    {
                        "severity": "critical",
                        "title": "Warfarin + Aspirin — bleeding risk",
                        "description": "Concurrent use increases bleeding risk significantly.",
                        "implicated_drugs": ["Warfarin", "Aspirin"],
                    }
                ]
            ),
        ):
            response = client.post(
                f"{BASE_URL}/check-interactions",
                json={"medications": [{"name": "Aspirin", "dosage": "81mg", "frequency": "once daily"}]},
                headers={"X-Doctor-Id": DOCTOR_ID},
            )

        assert response.status_code == 200
        data = response.json()
        assert "interactions" in data
        assert "checked_at" in data
        assert len(data["interactions"]) == 1
        assert data["interactions"][0]["severity"] == "critical"

    def test_returns_200_with_empty_interactions(self, client):
        with patch(
            "app.api.prescriptions.drug_interaction_service.check_interactions",
            new_callable=AsyncMock,
            return_value=_interaction_response([]),
        ):
            response = client.post(
                f"{BASE_URL}/check-interactions",
                json={"medications": [{"name": "Saline"}]},
                headers={"X-Doctor-Id": DOCTOR_ID},
            )

        assert response.status_code == 200
        assert response.json()["interactions"] == []

    def test_invalid_body_missing_medications_returns_422(self, client):
        response = client.post(
            f"{BASE_URL}/check-interactions",
            json={},
            headers={"X-Doctor-Id": DOCTOR_ID},
        )
        assert response.status_code == 422

    def test_blank_medication_name_returns_422(self, client):
        response = client.post(
            f"{BASE_URL}/check-interactions",
            json={"medications": [{"name": "   "}]},
            headers={"X-Doctor-Id": DOCTOR_ID},
        )
        assert response.status_code == 422

    def test_no_connection_returns_403(self, client):
        with patch(
            "app.api.prescriptions.drug_interaction_service.check_interactions",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=403, detail="No active connection"),
        ):
            response = client.post(
                f"{BASE_URL}/check-interactions",
                json={"medications": [{"name": "Aspirin"}]},
                headers={"X-Doctor-Id": DOCTOR_ID},
            )

        assert response.status_code == 403

    def test_response_shape_matches_schema(self, client):
        with patch(
            "app.api.prescriptions.drug_interaction_service.check_interactions",
            new_callable=AsyncMock,
            return_value=_interaction_response(
                [
                    {
                        "severity": "moderate",
                        "title": "Aspirin + Lisinopril interaction",
                        "description": "NSAIDs can reduce ACE inhibitor effectiveness.",
                        "implicated_drugs": ["Aspirin", "Lisinopril"],
                    }
                ]
            ),
        ):
            response = client.post(
                f"{BASE_URL}/check-interactions",
                json={
                    "medications": [
                        {"name": "Aspirin"},
                        {"name": "Lisinopril"},
                    ]
                },
                headers={"X-Doctor-Id": DOCTOR_ID},
            )

        assert response.status_code == 200
        interaction = response.json()["interactions"][0]
        assert set(interaction.keys()) == {
            "severity",
            "title",
            "description",
            "implicated_drugs",
        }
        assert isinstance(interaction["implicated_drugs"], list)
