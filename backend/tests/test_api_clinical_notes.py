from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.clinical_note import (
    ClinicalNoteCorrectionResponse,
    ClinicalNoteDraft,
    ClinicalNoteListResponse,
    ClinicalNoteResponse,
)

DOCTOR_ID = "doctor-1"
PATIENT_ID = "patient-1"
NOTE_ID = "note-1"


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as value:
        yield value


def note_response(correction=None):
    now = datetime(2026, 6, 24, tzinfo=timezone.utc)
    return ClinicalNoteResponse(
        note_id=NOTE_ID,
        patient_id=PATIENT_ID,
        doctor_id=DOCTOR_ID,
        doctor_display_name="Dr. Sam Lee",
        note_type="after_visit_summary",
        title="Visit summary",
        content="## Plan\nContinue medication.",
        encounter_date="2026-06-24",
        published_at=now,
        updated_at=now,
        correction_request=correction,
    )


def test_doctor_generate_and_publish_contract(client):
    with patch(
        "app.api.clinical_notes.clinical_note_service.generate_draft",
        new=AsyncMock(return_value=ClinicalNoteDraft(title="Draft", content="Draft body")),
    ):
        generated = client.post(
            f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/clinical-notes/generate",
            json={
                "note_type": "after_visit_summary",
                "encounter_date": "2026-06-24",
                "clinician_context": "Reviewed results.",
            },
        )
    assert generated.status_code == 200
    assert generated.json() == {"title": "Draft", "content": "Draft body"}

    with patch(
        "app.api.clinical_notes.clinical_note_service.publish_note",
        new=AsyncMock(return_value=note_response()),
    ):
        published = client.post(
            f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/clinical-notes",
            json={
                "note_type": "after_visit_summary",
                "encounter_date": "2026-06-24",
                "title": "Visit summary",
                "content": "## Plan\nContinue medication.",
            },
        )
    assert published.status_code == 201
    assert published.json()["note_id"] == NOTE_ID


def test_doctor_list_revise_and_resolve_contract(client):
    payload = ClinicalNoteListResponse(notes=[note_response()], total=1, skip=0, limit=50)
    with patch(
        "app.api.clinical_notes.clinical_note_service.doctor_list_notes",
        new=AsyncMock(return_value=payload),
    ):
        listed = client.get(
            f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/clinical-notes"
        )
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    with patch(
        "app.api.clinical_notes.clinical_note_service.revise_note",
        new=AsyncMock(return_value=note_response()),
    ):
        revised = client.patch(
            f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/clinical-notes/{NOTE_ID}",
            json={"content": "Updated"},
        )
    assert revised.status_code == 200

    correction = ClinicalNoteCorrectionResponse(
        correction_id="correction-1",
        note_id=NOTE_ID,
        patient_id=PATIENT_ID,
        doctor_id=DOCTOR_ID,
        comment="Dose is wrong",
        status="resolved",
        created_at="2026-06-24T00:00:00Z",
        resolved_at="2026-06-25T00:00:00Z",
        resolution_note="Corrected the dose.",
    )
    with patch(
        "app.api.clinical_notes.clinical_note_service.resolve_correction",
        new=AsyncMock(return_value=correction),
    ):
        resolved = client.post(
            f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/clinical-notes/{NOTE_ID}/correction-requests/correction-1/resolve",
            json={"resolution_note": "Corrected the dose."},
        )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"


def test_patient_read_and_correction_contract(client):
    patient_list = ClinicalNoteListResponse(
        notes=[note_response()], total=1, skip=0, limit=50
    )
    with (
        patch(
            "app.api.clinical_notes._patient_scope",
            new=AsyncMock(return_value=(object(), [PATIENT_ID])),
        ),
        patch(
            "app.api.clinical_notes.clinical_note_service.patient_list_notes",
            new=AsyncMock(return_value=patient_list),
        ),
    ):
        listed = client.get(f"/api/patients/{PATIENT_ID}/clinical-notes")
    assert listed.status_code == 200
    assert listed.json()["notes"][0]["note_id"] == NOTE_ID

    with (
        patch(
            "app.api.clinical_notes._patient_scope",
            new=AsyncMock(return_value=(object(), [PATIENT_ID])),
        ),
        patch(
            "app.api.clinical_notes.clinical_note_service.patient_get_note",
            new=AsyncMock(return_value=note_response()),
        ),
    ):
        detail = client.get(f"/api/patients/{PATIENT_ID}/clinical-notes/{NOTE_ID}")
    assert detail.status_code == 200
    assert detail.json()["doctor_display_name"] == "Dr. Sam Lee"

    correction = ClinicalNoteCorrectionResponse(
        correction_id="correction-1",
        note_id=NOTE_ID,
        patient_id=PATIENT_ID,
        doctor_id=DOCTOR_ID,
        comment="The dose should be 10 mg.",
        status="open",
        created_at="2026-06-24T00:00:00Z",
    )
    with (
        patch(
            "app.api.clinical_notes._patient_scope",
            new=AsyncMock(return_value=(object(), [PATIENT_ID])),
        ),
        patch(
            "app.api.clinical_notes.clinical_note_service.request_correction",
            new=AsyncMock(return_value=correction),
        ),
    ):
        response = client.post(
            f"/api/patients/{PATIENT_ID}/clinical-notes/{NOTE_ID}/correction-requests",
            json={"comment": "The dose should be 10 mg."},
        )
    assert response.status_code == 201
    assert response.json()["status"] == "open"


def test_clinical_note_validation_rejects_unknown_type_and_blank_correction(client):
    bad_note = client.post(
        f"/api/doctors/{DOCTOR_ID}/patients/{PATIENT_ID}/clinical-notes",
        json={
            "note_type": "private_note",
            "encounter_date": "2026-06-24",
            "title": "Title",
            "content": "Body",
        },
    )
    assert bad_note.status_code == 422

    bad_correction = client.post(
        f"/api/patients/{PATIENT_ID}/clinical-notes/{NOTE_ID}/correction-requests",
        json={"comment": ""},
    )
    assert bad_correction.status_code == 422
