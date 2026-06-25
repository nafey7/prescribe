from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ai.document_analysis import (
    ExtractedMedication,
    PatientDocumentAnalysis,
)
from app.service.ai_suggestions import process_document_for_suggestions


@pytest.mark.asyncio
async def test_direct_pdf_prescription_uses_existing_medication_suggestion_flow():
    document_analysis = PatientDocumentAnalysis(
        document_type="prescription",
        confidence="high",
        medications=[
            ExtractedMedication(
                name="Metformin",
                dosage="500 mg",
                frequency="twice daily",
                since="2026-06-20",
                source_text="Metformin 500 mg twice daily",
                confidence="high",
            )
        ],
    )
    db = MagicMock()
    db.documents.find_one = AsyncMock(
        return_value={
            "document_id": "doc-1",
            "patient_id": "patient-1",
            "category": "other",
            "content_type": "application/pdf",
            "filename": "prescription.pdf",
            "ai_document_analysis": None,
        }
    )
    db.users.find_one = AsyncMock(return_value=None)

    with (
        patch(
            "app.service.ai_suggestions.get_settings",
            return_value=MagicMock(
                AI_SUGGESTIONS_ENABLED=True,
                OPENAI_API_KEY="test-key",
            ),
        ),
        patch(
            "app.service.ai_suggestions._fetch_document_bytes",
            new=AsyncMock(return_value=b"%PDF-1.4 prescription"),
        ),
        patch(
            "app.service.ai_suggestions.analyze_patient_pdf",
            new=AsyncMock(return_value=document_analysis),
        ),
        patch(
            "app.service.ai_suggestions.document_repo.update_document",
            new_callable=AsyncMock,
        ) as update_document,
        patch(
            "app.service.ai_suggestions.suggestion_repo.create_suggestions",
            new=AsyncMock(),
        ) as create,
        patch(
            "app.service.ai_suggestions.extract_text_from_document",
            new_callable=AsyncMock,
        ) as local_extract,
    ):
        await process_document_for_suggestions(
            db, "patient-1", "doc-1", "other"
        )

    create.assert_awaited_once()
    suggestion = create.await_args.args[1][0]
    assert suggestion["category"] == "medication"
    assert suggestion["extracted_data"] == {
        "name": "Metformin",
        "dosage": "500 mg",
        "frequency": "twice daily",
        "since": "2026-06-20",
    }
    local_extract.assert_not_awaited()
    updates = [call.args[2] for call in update_document.await_args_list]
    assert updates[0]["analysis_status"] == "processing"
    assert any(update.get("category") == "prescription" for update in updates)
    assert updates[-1]["analysis_status"] == "completed"
