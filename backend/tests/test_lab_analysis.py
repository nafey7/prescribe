from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.ai.document_analysis import PatientDocumentAnalysis
from app.schemas.lab_analysis import LabAnalysisContent, LabMetric
from app.service.ai_suggestions import _lab_analysis_to_item
from app.service.lab_analysis import (
    INTERRUPTED_ERROR,
    NO_TEXT_ERROR,
    build_report_analysis,
    get_lab_analysis,
    run_lab_analysis_for_document,
)


def _content() -> LabAnalysisContent:
    return LabAnalysisContent(
        summary="Two results need attention and one is within the reported range.",
        normal_summary="Potassium is within the range printed on the report.",
        abnormal_summary="Glucose is high and troponin is marked critical.",
        next_steps="Review the flagged findings promptly with a clinician.",
        report_date="2026-06-20",
        metrics=[
            LabMetric(
                name="Glucose",
                value="145",
                unit="mg/dL",
                reference_range="70-99",
                status="high",
                classification_basis="report_flag",
                explanation="The report marks this result high.",
                source_text="Glucose 145 H mg/dL 70-99",
                confidence="high",
            ),
            LabMetric(
                name="Potassium",
                value="4.2",
                unit="mmol/L",
                reference_range="3.5-5.1",
                status="normal",
                classification_basis="reference_range",
                explanation="The value is inside the printed range.",
                source_text="Potassium 4.2 mmol/L 3.5-5.1",
                confidence="high",
            ),
            LabMetric(
                name="Sample quality",
                value="Hemolyzed",
                status="unknown",
                classification_basis="unknown",
                source_text="Sample quality: hemolyzed",
                confidence="medium",
            ),
            LabMetric(
                name="Troponin",
                value="2.0",
                unit="ng/mL",
                status="critical",
                classification_basis="report_flag",
                source_text="Troponin 2.0 CRITICAL",
                confidence="high",
            ),
        ],
        limitations=["One result had no printed reference range."],
    )


def test_build_report_analysis_groups_metric_statuses():
    result = build_report_analysis(_content())

    assert result.critical_count == 1
    assert result.abnormal_count == 2
    assert result.normal_count == 1
    assert result.unknown_count == 1
    assert result.normal_summary.startswith("Potassium")
    assert "clinician" in result.next_steps
    assert "not a diagnosis" in result.disclaimer


def test_critical_status_requires_an_explicit_report_flag():
    metric = LabMetric(
        name="Example",
        value="999",
        status="critical",
        classification_basis="reference_range",
    )

    assert metric.status == "abnormal"


def test_ocr_down_arrow_is_removed_from_numeric_value():
    metric = LabMetric(
        name="Haemoglobin",
        value="v11.4",
        unit="g/dL",
        reference_range="12-15",
        status="unknown",
        classification_basis="unknown",
    )

    assert metric.value == "11.4"
    assert metric.status == "low"
    assert metric.classification_basis == "report_flag"


def test_numeric_classification_is_reconciled_with_printed_range():
    at_upper_bound = LabMetric(
        name="RDW-CV",
        value="15",
        reference_range="11.6-15.0",
        status="high",
        classification_basis="reference_range",
    )
    above_upper_limit = LabMetric(
        name="HbA1C",
        value="6.8",
        reference_range="<5.7",
        status="normal",
        classification_basis="reference_range",
    )

    assert at_upper_bound.status == "normal"
    assert above_upper_limit.status == "high"


def test_lab_analysis_adapts_to_existing_lab_suggestion():
    item = _lab_analysis_to_item(build_report_analysis(_content()))

    assert item is not None
    assert item["category"] == "lab_result"
    assert item["extracted_data"]["date"] == "2026-06-20"
    assert item["extracted_data"]["results"][0] == {
        "name": "Glucose",
        "value": "145 mg/dL",
        "status": "high",
        "reference_range": "70-99",
    }


@pytest.mark.asyncio
async def test_run_lab_analysis_persists_completed_result():
    state = {
        "document_id": "lab-1",
        "patient_id": "patient-1",
        "category": "lab_result",
        "extracted_text": "Glucose 145 H mg/dL; range 70-99",
        "analysis_status": "queued",
        "analysis_error": "Previous extraction error",
    }

    async def update(_db, _document_id, data):
        state.update(data)
        return dict(state)

    with (
        patch(
            "app.service.lab_analysis.document_repo.get_document_by_document_id",
            new=AsyncMock(return_value=state),
        ),
        patch(
            "app.service.lab_analysis.document_repo.update_document",
            side_effect=update,
        ) as update_mock,
        patch(
            "app.service.lab_analysis.generate_lab_analysis",
            new=AsyncMock(return_value=_content()),
        ),
    ):
        response = await run_lab_analysis_for_document(AsyncMock(), "lab-1")

    assert response.status == "completed"
    assert response.analysis is not None
    assert response.error is None
    assert response.analysis.abnormal_count == 2
    assert update_mock.await_count == 2
    assert state["lab_analysis"]["normal_count"] == 1


@pytest.mark.asyncio
async def test_get_lab_analysis_marks_stale_processing_job_failed():
    old = datetime.now(timezone.utc) - timedelta(minutes=10)
    state = {
        "document_id": "lab-stuck",
        "patient_id": "patient-1",
        "category": "lab_result",
        "analysis_status": "processing",
        "analysis_error": "",
        "updated_at": old,
        "uploaded_at": old,
    }

    async def update(_db, _document_id, data):
        state.update(data)
        return dict(state)

    with (
        patch(
            "app.service.lab_analysis.patient_repo.find_patient_by_id_or_slug",
            new=AsyncMock(return_value={"user_id": "patient-1"}),
        ),
        patch(
            "app.service.lab_analysis.document_repo.get_document_by_document_id",
            new=AsyncMock(return_value=state),
        ),
        patch(
            "app.service.lab_analysis.document_repo.update_document",
            side_effect=update,
        ) as update_mock,
        patch(
            "app.service.lab_analysis.get_settings",
            return_value=type("Settings", (), {"AI_RUN_TIMEOUT_SECONDS": 30})(),
        ),
    ):
        response = await get_lab_analysis(AsyncMock(), "patient-1", "lab-stuck")

    assert response.status == "failed"
    assert response.error == INTERRUPTED_ERROR
    assert state["analysis_status"] == "failed"
    update_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_lab_analysis_completes_stale_job_with_stored_analysis():
    old = datetime.now(timezone.utc) - timedelta(minutes=10)
    report = build_report_analysis(_content())
    state = {
        "document_id": "lab-stale-complete",
        "patient_id": "patient-1",
        "category": "lab_result",
        "analysis_status": "processing",
        "analysis_error": "",
        "updated_at": old,
        "uploaded_at": old,
        "lab_analysis": report.model_dump(),
    }

    async def update(_db, _document_id, data):
        state.update(data)
        return dict(state)

    with (
        patch(
            "app.service.lab_analysis.patient_repo.find_patient_by_id_or_slug",
            new=AsyncMock(return_value={"user_id": "patient-1"}),
        ),
        patch(
            "app.service.lab_analysis.document_repo.get_document_by_document_id",
            new=AsyncMock(return_value=state),
        ),
        patch(
            "app.service.lab_analysis.document_repo.update_document",
            side_effect=update,
        ) as update_mock,
        patch(
            "app.service.lab_analysis.get_settings",
            return_value=type("Settings", (), {"AI_RUN_TIMEOUT_SECONDS": 30})(),
        ),
    ):
        response = await get_lab_analysis(
            AsyncMock(), "patient-1", "lab-stale-complete"
        )

    assert response.status == "completed"
    assert response.analysis is not None
    assert response.error is None
    assert state["analysis_status"] == "completed"
    update_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_lab_analysis_fails_visibly_when_text_is_unreadable():
    state = {
        "document_id": "lab-empty",
        "patient_id": "patient-1",
        "category": "lab_result",
        "extracted_text": "",
        "analysis_status": "queued",
    }

    async def update(_db, _document_id, data):
        state.update(data)
        return dict(state)

    with (
        patch(
            "app.service.lab_analysis.document_repo.get_document_by_document_id",
            new=AsyncMock(return_value=state),
        ),
        patch(
            "app.service.lab_analysis.document_repo.update_document",
            side_effect=update,
        ),
        patch(
            "app.service.lab_analysis.generate_lab_analysis",
            new_callable=AsyncMock,
        ) as generate,
        patch(
            "app.service.lab_analysis._recover_document_text",
            new=AsyncMock(return_value=""),
        ),
    ):
        response = await run_lab_analysis_for_document(AsyncMock(), "lab-empty")

    assert response.status == "failed"
    assert response.error == NO_TEXT_ERROR
    generate.assert_not_awaited()


@pytest.mark.asyncio
async def test_retry_sends_pdf_directly_to_openai_before_analysis():
    state = {
        "document_id": "lab-scan",
        "patient_id": "patient-1",
        "category": "lab_result",
        "content_type": "application/pdf",
        "filename": "lab-report.pdf",
        "gridfs_file_id": "507f1f77bcf86cd799439011",
        "extracted_text": "Haemoglobin v114 12-15 g/dL",
        "text_extraction_status": "retry_requested",
        "analysis_status": "queued",
    }

    async def update(_db, _document_id, data):
        state.update(data)
        return dict(state)

    with (
        patch(
            "app.service.lab_analysis.document_repo.get_document_by_document_id",
            new=AsyncMock(return_value=state),
        ),
        patch(
            "app.service.lab_analysis.document_repo.update_document",
            side_effect=update,
        ),
        patch(
            "app.service.lab_analysis._read_document_bytes",
            new=AsyncMock(return_value=b"%PDF-1.4 scan"),
        ) as read_bytes,
        patch(
            "app.service.lab_analysis.analyze_patient_pdf",
            new=AsyncMock(
                return_value=PatientDocumentAnalysis(
                    document_type="lab_report",
                    confidence="high",
                    lab_analysis=_content(),
                )
            ),
        ) as analyze_pdf,
    ):
        response = await run_lab_analysis_for_document(AsyncMock(), "lab-scan")

    assert response.status == "completed"
    read_bytes.assert_awaited_once()
    analyze_pdf.assert_awaited_once_with(b"%PDF-1.4 scan", "lab-report.pdf")
