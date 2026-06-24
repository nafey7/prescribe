from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from app.ai.clinical_note_draft import generate_clinical_note_draft
from app.schemas.clinical_note import (
    ClinicalNoteCreate,
    ClinicalNoteDraft,
    ClinicalNoteGenerateRequest,
    ClinicalNoteUpdate,
)
from app.schemas.enums import ClinicalNoteType
from app.service import clinical_note as service


def test_note_schema_rejects_blank_content_and_empty_patch():
    with pytest.raises(ValidationError):
        ClinicalNoteCreate(
            note_type="encounter_note",
            title="Visit",
            content="",
            encounter_date="2026-06-24",
        )
    with pytest.raises(ValidationError):
        ClinicalNoteUpdate()
    with pytest.raises(ValidationError):
        ClinicalNoteGenerateRequest(
            note_type="encounter_note",
            encounter_date="2026-06-24",
            clinician_context="   ",
        )


@pytest.mark.asyncio
async def test_generate_draft_uses_canonical_patient_context():
    patient = {
        "user_id": "patient-1",
        "patient_profile": {
            "first_name": "Alex",
            "last_name": "Rivera",
            "conditions": [{"name": "Asthma"}],
            "medications": [{"name": "Albuterol", "frequency": "as needed"}],
            "allergies": [],
        },
    }
    expected = ClinicalNoteDraft(
        title="Asthma follow-up", content="## Discussion\nStable."
    )
    with (
        patch.object(service, "_doctor_patient", new=AsyncMock(return_value=patient)),
        patch.object(
            service,
            "generate_clinical_note_draft",
            new=AsyncMock(return_value=expected),
        ) as generate,
    ):
        result = await service.generate_draft(
            object(),
            "doctor-1",
            "alex",
            ClinicalNoteGenerateRequest(
                note_type="after_visit_summary",
                encounter_date="2026-06-24",
                clinician_context="Reviewed inhaler technique.",
            ),
        )

    assert result == expected
    kwargs = generate.await_args.kwargs
    assert "Asthma" in kwargs["patient_context"]
    assert "Albuterol" in kwargs["patient_context"]
    assert kwargs["clinician_context"] == "Reviewed inhaler technique."


@pytest.mark.asyncio
async def test_publish_note_writes_canonical_patient_and_reviewed_content():
    patient = {"user_id": "patient-uuid"}
    now = datetime.now(timezone.utc)

    async def echo_response(_db, rows):
        return [rows[0]]

    with (
        patch.object(service, "_doctor_patient", new=AsyncMock(return_value=patient)),
        patch.object(service.note_repo, "insert_note", new=AsyncMock()) as insert,
        patch.object(service, "_responses", side_effect=echo_response),
    ):
        insert.side_effect = lambda _db, row: row
        result = await service.publish_note(
            object(),
            "doctor-1",
            "legacy-slug",
            ClinicalNoteCreate(
                note_type="encounter_note",
                title="  Follow-up  ",
                content="  Patient-reported update.  ",
                encounter_date=date(2026, 6, 24),
            ),
        )

    assert result["patient_id"] == "patient-uuid"
    assert result["doctor_id"] == "doctor-1"
    assert result["title"] == "Follow-up"
    assert result["content"] == "Patient-reported update."
    assert result["encounter_date"] == "2026-06-24"
    assert result["published_at"] >= now


@pytest.mark.asyncio
async def test_duplicate_open_correction_maps_to_conflict():
    note = {"note_id": "note-1", "patient_id": "patient-1", "doctor_id": "doctor-1"}
    with (
        patch.object(service.note_repo, "get_note", new=AsyncMock(return_value=note)),
        patch.object(
            service.note_repo,
            "insert_correction",
            new=AsyncMock(side_effect=DuplicateKeyError("duplicate")),
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            await service.request_correction(
                object(),
                patient_ids=["patient-1"],
                note_id="note-1",
                comment="The medication dose is incorrect.",
            )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_correction_request_and_resolution_keep_note_author_scope():
    note = {"note_id": "note-1", "patient_id": "patient-1", "doctor_id": "doctor-1"}

    async def echo_insert(_db, row):
        return row

    with (
        patch.object(service.note_repo, "get_note", new=AsyncMock(return_value=note)),
        patch.object(service.note_repo, "insert_correction", side_effect=echo_insert) as insert,
    ):
        requested = await service.request_correction(
            object(),
            patient_ids=["patient-1", "legacy-slug"],
            note_id="note-1",
            comment="  The dose should be 10 mg.  ",
        )
    assert requested.patient_id == "patient-1"
    assert requested.doctor_id == "doctor-1"
    assert requested.comment == "The dose should be 10 mg."
    assert insert.await_args.args[1]["status"] == "open"

    resolved_row = {
        **insert.await_args.args[1],
        "status": "resolved",
        "resolved_at": datetime.now(timezone.utc),
        "resolution_note": "Updated after review.",
    }
    with (
        patch.object(
            service, "_doctor_patient", new=AsyncMock(return_value={"user_id": "patient-1"})
        ),
        patch.object(service.note_repo, "get_note", new=AsyncMock(return_value=note)),
        patch.object(
            service.note_repo, "resolve_correction", new=AsyncMock(return_value=resolved_row)
        ) as resolve,
    ):
        response = await service.resolve_correction(
            object(),
            "doctor-1",
            "legacy-slug",
            "note-1",
            requested.correction_id,
            "Updated after review.",
        )
    assert response.status == "resolved"
    assert resolve.await_args.kwargs["patient_id"] == "patient-1"


@pytest.mark.asyncio
async def test_ai_draft_uses_structured_output_and_review_prompt():
    captured = {}

    class Structured:
        def invoke(self, messages):
            captured["messages"] = messages
            return {"title": "Visit summary", "content": "## Plan\nContinue care."}

    class Llm:
        def with_structured_output(self, schema):
            captured["schema"] = schema
            return Structured()

    with patch("app.ai.clinical_note_draft.get_llm_deterministic", return_value=Llm()):
        result = await generate_clinical_note_draft(
            note_type=ClinicalNoteType.AFTER_VISIT_SUMMARY,
            encounter_date="2026-06-24",
            patient_context="Conditions: asthma",
            clinician_context="Reviewed inhaler use.",
        )

    assert result.title == "Visit summary"
    prompt = "\n".join(str(message.content) for message in captured["messages"])
    assert "Never invent" in prompt
    assert "Reviewed inhaler use" in prompt
