import base64
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import UploadFile

from app.ai.document_analysis import (
    PatientDocumentAnalysis,
    analyze_patient_pdf,
)
from app.service.document import upload_document


def _pdf() -> UploadFile:
    return UploadFile(
        filename="patient-document.pdf",
        file=BytesIO(b"%PDF-1.4 test"),
        headers={"content-type": "application/pdf"},
    )


@pytest.mark.asyncio
async def test_openai_receives_pdf_as_file_input_with_structured_output():
    parsed = PatientDocumentAnalysis(document_type="other", confidence="low")
    parse = MagicMock(return_value=MagicMock(output_parsed=parsed))
    client = MagicMock()
    client.responses.parse = parse

    with (
        patch(
            "app.ai.document_analysis.get_settings",
            return_value=MagicMock(
                OPENAI_API_KEY="test-key",
                AI_RUN_TIMEOUT_SECONDS=30,
                DOCUMENT_MODEL_OPENAI="gpt-4o-mini",
            ),
        ),
        patch("app.ai.document_analysis.OpenAI", return_value=client),
    ):
        result = await analyze_patient_pdf(b"%PDF-1.4 direct", "report.pdf")

    assert result.document_type == "other"
    kwargs = parse.call_args.kwargs
    assert kwargs["model"] == "gpt-4o-mini"
    assert kwargs["text_format"] is PatientDocumentAnalysis
    assert kwargs["store"] is False
    file_part = kwargs["input"][0]["content"][0]
    assert file_part["type"] == "input_file"
    encoded = file_part["file_data"].split(",", 1)[1]
    assert base64.b64decode(encoded) == b"%PDF-1.4 direct"


@pytest.mark.asyncio
async def test_pdf_upload_returns_queued_before_openai_processing():
    created: dict = {}

    async def capture(_db, metadata):
        created.update(metadata)

    with (
        patch(
            "app.service.document.get_settings",
            return_value=MagicMock(
                AI_SUGGESTIONS_ENABLED=True,
                OPENAI_API_KEY="test-key",
            ),
        ),
        patch(
            "app.service.document._resolve_patient_user_id",
            new=AsyncMock(return_value="patient-1"),
        ),
        patch(
            "app.service.document.document_repo.upload_file",
            new=AsyncMock(return_value="gridfs-1"),
        ),
        patch(
            "app.service.document.document_repo.create_document",
            new=AsyncMock(side_effect=capture),
        ),
    ):
        result = await upload_document(
            AsyncMock(), "patient-1", _pdf(), "other", ""
        )

    assert result.category == "other"
    assert result.analysis_status == "queued"
    assert created["category"] == "other"
    assert created["ai_document_analysis"] is None
    assert created["lab_analysis"] is None


@pytest.mark.asyncio
async def test_pdf_upload_preserves_selected_category_until_background_routing():
    created: dict = {}

    async def capture(_db, metadata):
        created.update(metadata)

    with (
        patch(
            "app.service.document.get_settings",
            return_value=MagicMock(
                AI_SUGGESTIONS_ENABLED=True,
                OPENAI_API_KEY="test-key",
            ),
        ),
        patch(
            "app.service.document._resolve_patient_user_id",
            new=AsyncMock(return_value="patient-1"),
        ),
        patch(
            "app.service.document.document_repo.upload_file",
            new=AsyncMock(return_value="gridfs-1"),
        ),
        patch(
            "app.service.document.document_repo.create_document",
            new=AsyncMock(side_effect=capture),
        ),
    ):
        result = await upload_document(
            AsyncMock(), "patient-1", _pdf(), "prescription", ""
        )

    assert result.category == "prescription"
    assert result.analysis_status == "queued"
    assert created["category"] == "prescription"
    assert created["extracted_text"] == ""
    assert created["ai_document_analysis"] is None
