import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.ai.pre_visit_brief import generate_pre_visit_brief as run_brief_model
from app.schemas.pre_visit_brief import PreVisitBriefContent
from app.service.pre_visit_brief import generate_pre_visit_brief


FIXED_NOW = datetime(2026, 6, 24, 12, 0, tzinfo=timezone.utc)


def test_content_rejects_more_than_four_bullets():
    with pytest.raises(ValidationError):
        PreVisitBriefContent(
            summary="Summary",
            recent_documents=["one", "two", "three", "four", "five"],
        )


@pytest.mark.asyncio
async def test_ai_adapter_uses_structured_output_schema():
    content = PreVisitBriefContent(
        summary="One result needs review.",
        abnormal_labs=["Potassium is explicitly marked high."],
    )
    structured = MagicMock()
    structured.invoke.return_value = content
    llm = MagicMock()
    llm.with_structured_output.return_value = structured

    with patch("app.ai.pre_visit_brief.get_llm_deterministic", return_value=llm):
        result = await run_brief_model('{"recent_documents": []}')

    assert result == content
    llm.with_structured_output.assert_called_once_with(PreVisitBriefContent)
    messages = structured.invoke.call_args.args[0]
    assert "Evidence packet" in messages[1].content


@pytest.mark.asyncio
async def test_service_collects_bounded_canonical_evidence_and_filters_rejected():
    patient_doc = {
        "user_id": "patient-canonical",
        "patient_profile": {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "conditions": [{"name": "Hypertension"}],
            "medications": [{"name": "Lisinopril", "dosage": "10 mg", "frequency": "daily"}],
            "allergies": [],
        },
    }
    documents = [
        {
            "document_id": "doc-1",
            "filename": "cbc.pdf",
            "category": "lab_result",
            "uploaded_at": FIXED_NOW,
            "extracted_text": "x" * 6_000,
        }
    ]
    prescriptions = [
        {
            "prescription_id": "rx-1",
            "status": "active",
            "issued_at": FIXED_NOW,
            "medications": [{"name": "Lisinopril", "dosage": "10 mg"}],
        }
    ]
    findings = [
        {
            "suggestion_id": "finding-pending",
            "document_id": "doc-1",
            "category": "lab_result",
            "status": "pending",
            "extracted_data": {"results": [{"name": "Hemoglobin", "status": "low"}]},
            "source_text": "Hemoglobin low",
        },
        {
            "suggestion_id": "finding-rejected",
            "document_id": "doc-1",
            "category": "condition",
            "status": "rejected",
        },
    ]
    generated = PreVisitBriefContent(
        summary="A low hemoglobin finding is pending review.",
        recent_documents=["CBC was uploaded."],
        abnormal_labs=["Hemoglobin is marked low."],
        unresolved_concerns=["The extracted finding is pending review."],
    )
    db = object()

    with (
        patch(
            "app.service.pre_visit_brief.patient_repo.find_patient_by_id_or_slug",
            new_callable=AsyncMock,
            return_value=patient_doc,
        ),
        patch(
            "app.service.pre_visit_brief.connection_service.verify_connection",
            new_callable=AsyncMock,
        ) as verify,
        patch(
            "app.service.pre_visit_brief.document_repo.list_recent_documents_for_patient",
            new_callable=AsyncMock,
            return_value=documents,
        ) as list_docs,
        patch(
            "app.service.pre_visit_brief.prescriptions_repo.list_prescriptions_for_patient",
            new_callable=AsyncMock,
            return_value=prescriptions,
        ) as list_rx,
        patch(
            "app.service.pre_visit_brief.suggestion_repo.list_suggestions",
            new_callable=AsyncMock,
            return_value=findings,
        ),
        patch(
            "app.service.pre_visit_brief.run_brief_model",
            new_callable=AsyncMock,
            return_value=generated,
        ) as model,
        patch("app.service.pre_visit_brief.utcnow", return_value=FIXED_NOW),
    ):
        result = await generate_pre_visit_brief(db, "doctor-1", "patient-slug")

    verify.assert_awaited_once_with(db, "doctor-1", "patient-canonical")
    assert list_docs.await_args.args[1] == "patient-canonical"
    assert list_docs.await_args.kwargs["limit"] == 8
    assert list_rx.await_args.args[1] == "patient-canonical"
    assert list_rx.await_args.kwargs["limit"] == 20

    packet = json.loads(model.await_args.args[0])
    assert len(packet["recent_documents"][0]["extracted_text"]) == 5_000
    assert [f["suggestion_id"] for f in packet["document_findings"]] == [
        "finding-pending"
    ]
    assert result.evidence.document_count == 1
    assert result.evidence.prescription_count == 1
    assert result.evidence.finding_count == 1
    assert result.evidence.pending_finding_count == 1
    assert result.generated_at == FIXED_NOW.isoformat()


@pytest.mark.asyncio
async def test_service_skips_llm_when_recent_evidence_is_empty():
    patient_doc = {"user_id": "patient-1", "patient_profile": {}}
    with (
        patch(
            "app.service.pre_visit_brief.patient_repo.find_patient_by_id_or_slug",
            new_callable=AsyncMock,
            return_value=patient_doc,
        ),
        patch(
            "app.service.pre_visit_brief.connection_service.verify_connection",
            new_callable=AsyncMock,
        ),
        patch(
            "app.service.pre_visit_brief.document_repo.list_recent_documents_for_patient",
            new_callable=AsyncMock,
            return_value=[],
        ),
        patch(
            "app.service.pre_visit_brief.prescriptions_repo.list_prescriptions_for_patient",
            new_callable=AsyncMock,
            return_value=[],
        ),
        patch(
            "app.service.pre_visit_brief.suggestion_repo.list_suggestions",
            new_callable=AsyncMock,
            return_value=[],
        ),
        patch(
            "app.service.pre_visit_brief.run_brief_model", new_callable=AsyncMock
        ) as model,
        patch("app.service.pre_visit_brief.utcnow", return_value=FIXED_NOW),
    ):
        result = await generate_pre_visit_brief(object(), "doctor-1", "patient-1")

    model.assert_not_awaited()
    assert "No recent documents" in result.summary
    assert result.recent_documents == []


@pytest.mark.asyncio
async def test_service_stops_when_doctor_is_not_connected():
    patient_doc = {"user_id": "patient-1", "patient_profile": {}}
    with (
        patch(
            "app.service.pre_visit_brief.patient_repo.find_patient_by_id_or_slug",
            new_callable=AsyncMock,
            return_value=patient_doc,
        ),
        patch(
            "app.service.pre_visit_brief.connection_service.verify_connection",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=403, detail="No active connection"),
        ),
        patch(
            "app.service.pre_visit_brief.document_repo.list_recent_documents_for_patient",
            new_callable=AsyncMock,
        ) as list_docs,
    ):
        with pytest.raises(HTTPException) as exc:
            await generate_pre_visit_brief(object(), "doctor-1", "patient-1")

    assert exc.value.status_code == 403
    list_docs.assert_not_awaited()


@pytest.mark.asyncio
async def test_service_returns_404_before_connection_check_for_unknown_patient():
    with patch(
        "app.service.pre_visit_brief.patient_repo.find_patient_by_id_or_slug",
        new_callable=AsyncMock,
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            await generate_pre_visit_brief(object(), "doctor-1", "missing")
    assert exc.value.status_code == 404
