"""Unit tests for drug interaction service and AI graph.

Run via the backend container:
    docker compose exec backend python -m pytest tests/test_drug_interaction_service.py -v
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.drug_interaction import (
    DrugInteraction,
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponseAI,
    MedicationCheckItem,
)


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


class TestMedicationCheckItem:
    def test_valid_item(self):
        item = MedicationCheckItem(name="Aspirin", dosage="81mg", frequency="once daily")
        assert item.name == "Aspirin"

    def test_blank_name_rejected(self):
        with pytest.raises(ValidationError):
            MedicationCheckItem(name="   ")

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            MedicationCheckItem(name="")

    def test_dosage_and_frequency_optional(self):
        item = MedicationCheckItem(name="Warfarin")
        assert item.dosage == ""
        assert item.frequency == ""


class TestDrugInteractionCheckRequest:
    def test_valid_request(self):
        req = DrugInteractionCheckRequest(
            medications=[
                MedicationCheckItem(name="Warfarin"),
                MedicationCheckItem(name="Aspirin"),
            ]
        )
        assert len(req.medications) == 2

    def test_empty_medications_list_allowed(self):
        req = DrugInteractionCheckRequest(medications=[])
        assert req.medications == []


# ---------------------------------------------------------------------------
# Drug interaction service (mocked DB + LLM)
# ---------------------------------------------------------------------------

_PATIENT_DOC_WITH_WARFARIN = {
    "user_id": "patient-1",
    "role": "patient",
    "patient_profile": {
        "first_name": "Jane",
        "last_name": "Doe",
        "conditions": [{"name": "Atrial fibrillation"}],
        "medications": [{"name": "Warfarin", "dosage": "5mg", "frequency": "once daily"}],
        "allergies": [{"name": "Penicillin", "reaction": "anaphylaxis", "severity": "severe"}],
        "family_history": [],
    },
}

_PATIENT_DOC_NO_MEDS = {
    "user_id": "patient-2",
    "role": "patient",
    "patient_profile": {
        "first_name": "John",
        "last_name": "Smith",
        "conditions": [],
        "medications": [],
        "allergies": [],
        "family_history": [],
    },
}


def _make_ai_response(interactions: list[dict]) -> DrugInteractionCheckResponseAI:
    return DrugInteractionCheckResponseAI(
        interactions=[DrugInteraction(**i) for i in interactions]
    )


@pytest.mark.asyncio
class TestCheckInteractionsService:
    async def test_critical_drug_drug_interaction(self):
        """Warfarin (existing) + Aspirin (proposed) → critical interaction returned."""
        from app.service.drug_interaction_service import check_interactions

        ai_response = _make_ai_response(
            [
                {
                    "severity": "critical",
                    "title": "Warfarin + Aspirin — bleeding risk",
                    "description": "Concurrent use significantly increases bleeding risk.",
                    "implicated_drugs": ["Warfarin", "Aspirin"],
                }
            ]
        )

        fake_db = MagicMock()

        with (
            patch(
                "app.service.drug_interaction_service.patient_repo.find_patient_by_id_or_slug",
                new_callable=AsyncMock,
                return_value=_PATIENT_DOC_WITH_WARFARIN,
            ),
            patch(
                "app.service.drug_interaction_service.connection_service.verify_connection",
                new_callable=AsyncMock,
            ),
            patch(
                "app.service.drug_interaction_service.check_drug_interactions",
                new_callable=AsyncMock,
            ) as mock_check,
        ):
            from app.schemas.drug_interaction import DrugInteractionCheckResponse

            mock_check.return_value = DrugInteractionCheckResponse(
                interactions=ai_response.interactions,
                checked_at="2026-05-10T00:00:00Z",
            )
            req = DrugInteractionCheckRequest(
                medications=[MedicationCheckItem(name="Aspirin")]
            )
            result = await check_interactions(fake_db, "doctor-1", "patient-1", req)

        assert len(result.interactions) == 1
        assert result.interactions[0].severity == "critical"
        assert "Warfarin" in result.interactions[0].implicated_drugs

    async def test_drug_allergy_interaction(self):
        """Proposed Penicillin when patient is allergic → critical returned."""
        from app.service.drug_interaction_service import check_interactions

        ai_response = _make_ai_response(
            [
                {
                    "severity": "critical",
                    "title": "Penicillin — documented allergy",
                    "description": "Patient has documented anaphylaxis to Penicillin.",
                    "implicated_drugs": ["Penicillin"],
                }
            ]
        )

        fake_db = MagicMock()

        with (
            patch(
                "app.service.drug_interaction_service.patient_repo.find_patient_by_id_or_slug",
                new_callable=AsyncMock,
                return_value=_PATIENT_DOC_WITH_WARFARIN,
            ),
            patch(
                "app.service.drug_interaction_service.connection_service.verify_connection",
                new_callable=AsyncMock,
            ),
            patch(
                "app.service.drug_interaction_service.check_drug_interactions",
                new_callable=AsyncMock,
            ) as mock_check,
        ):
            from app.schemas.drug_interaction import DrugInteractionCheckResponse

            mock_check.return_value = DrugInteractionCheckResponse(
                interactions=ai_response.interactions,
                checked_at="2026-05-10T00:00:00Z",
            )
            req = DrugInteractionCheckRequest(
                medications=[MedicationCheckItem(name="Penicillin")]
            )
            result = await check_interactions(fake_db, "doctor-1", "patient-1", req)

        assert len(result.interactions) == 1
        assert result.interactions[0].severity == "critical"

    async def test_no_interactions_returns_empty(self):
        """Safe medication combination returns empty interactions list."""
        from app.service.drug_interaction_service import check_interactions

        fake_db = MagicMock()

        with (
            patch(
                "app.service.drug_interaction_service.patient_repo.find_patient_by_id_or_slug",
                new_callable=AsyncMock,
                return_value=_PATIENT_DOC_NO_MEDS,
            ),
            patch(
                "app.service.drug_interaction_service.connection_service.verify_connection",
                new_callable=AsyncMock,
            ),
            patch(
                "app.service.drug_interaction_service.check_drug_interactions",
                new_callable=AsyncMock,
            ) as mock_check,
        ):
            from app.schemas.drug_interaction import DrugInteractionCheckResponse

            mock_check.return_value = DrugInteractionCheckResponse(
                interactions=[],
                checked_at="2026-05-10T00:00:00Z",
            )
            req = DrugInteractionCheckRequest(
                medications=[MedicationCheckItem(name="Saline")]
            )
            result = await check_interactions(fake_db, "doctor-1", "patient-2", req)

        assert result.interactions == []

    async def test_patient_not_found_raises_404(self):
        """Missing patient document raises 404."""
        from app.service.drug_interaction_service import check_interactions

        fake_db = MagicMock()

        with patch(
            "app.service.drug_interaction_service.patient_repo.find_patient_by_id_or_slug",
            new_callable=AsyncMock,
            return_value=None,
        ):
            with pytest.raises(HTTPException) as exc_info:
                req = DrugInteractionCheckRequest(
                    medications=[MedicationCheckItem(name="Aspirin")]
                )
                await check_interactions(fake_db, "doctor-1", "unknown-patient", req)

        assert exc_info.value.status_code == 404

    async def test_no_connection_raises_403(self):
        """Doctor not connected to patient raises 403."""
        from app.service.drug_interaction_service import check_interactions

        fake_db = MagicMock()

        with (
            patch(
                "app.service.drug_interaction_service.patient_repo.find_patient_by_id_or_slug",
                new_callable=AsyncMock,
                return_value=_PATIENT_DOC_WITH_WARFARIN,
            ),
            patch(
                "app.service.drug_interaction_service.connection_service.verify_connection",
                new_callable=AsyncMock,
                side_effect=HTTPException(status_code=403, detail="No active connection"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                req = DrugInteractionCheckRequest(
                    medications=[MedicationCheckItem(name="Aspirin")]
                )
                await check_interactions(fake_db, "doctor-unconnected", "patient-1", req)

        assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# AI graph — LLM failure handled gracefully
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_llm_failure_fails_closed():
    """LLM failure must not be represented as a safe, empty interaction result."""
    from app.ai.drug_interaction_graph import check_drug_interactions

    with patch(
        "app.ai.drug_interaction_graph.get_llm_deterministic"
    ) as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.with_structured_output.return_value.invoke.side_effect = RuntimeError(
            "LLM unavailable"
        )
        mock_get_llm.return_value = mock_llm

        with pytest.raises(RuntimeError, match="screening is unavailable"):
            await check_drug_interactions(
                [{"name": "Aspirin"}], "Patient: Test\nAllergies:\n- (none on record)"
            )
