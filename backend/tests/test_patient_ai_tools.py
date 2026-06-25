"""Unit tests for patient-scoped AI chat tools."""

from unittest.mock import MagicMock, patch

from app.ai.tools import search_patient_documents, search_patient_records


def _cursor(docs):
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.__iter__ = MagicMock(return_value=iter(docs))
    return cursor


def test_search_patient_records_fetches_profile_and_prescriptions():
    db = MagicMock()
    db.users.find_one.return_value = {
        "user_id": "patient-1",
        "patient_slug": "jane",
        "role": "patient",
        "patient_profile": {
            "first_name": "Jane",
            "last_name": "Doe",
            "conditions": [{"name": "Type 2 diabetes"}],
            "medications": [
                {
                    "name": "Metformin",
                    "dosage": "500 mg",
                    "frequency": "twice daily",
                }
            ],
            "allergies": [
                {
                    "substance": "Penicillin",
                    "reaction": "rash",
                    "severity": "moderate",
                }
            ],
        },
    }
    db.prescriptions.find.return_value = _cursor(
        [
            {
                "patient_id": "patient-1",
                "prescription_id": "rx-1",
                "status": "active",
                "diagnosis_summary": "Hypertension",
                "medications": [
                    {
                        "name": "Lisinopril",
                        "dosage": "10 mg",
                        "frequency": "daily",
                    }
                ],
            }
        ]
    )
    db.documents.find.return_value = _cursor([])

    with patch("app.ai.tools._get_sync_db", return_value=db):
        result = search_patient_records.invoke({"patient_id": "jane"})

    db.users.find_one.assert_called_once()
    db.prescriptions.find.assert_called_once_with(
        {
            "patient_id": "patient-1",
            "status": {"$in": ["active", "draft", "superseded"]},
        }
    )
    assert "Type 2 diabetes" in result
    assert "Metformin" in result
    assert "Lisinopril" in result
    assert "Penicillin (rash, moderate)" in result
    assert "#citation-profile-conditions" in result
    assert "#citation-profile-medications" in result
    assert "#citation-profile-allergies" in result


def test_search_patient_documents_uses_stored_summary_and_lab_analysis():
    db = MagicMock()
    db.users.find_one.return_value = {"user_id": "patient-1", "role": "patient"}
    db.documents.find.return_value = _cursor(
        [
            {
                "patient_id": "patient-1",
                "document_id": "doc-summary",
                "filename": "visit-summary.pdf",
                "category": "clinical_note",
                "description": "Cardiology follow-up",
                "analysis_status": "completed",
                "ai_summary": "Patient reported improved exercise tolerance.",
                "extracted_text": "Full note text should remain bounded evidence.",
            },
            {
                "patient_id": "patient-1",
                "document_id": "lab-1",
                "filename": "lipids.pdf",
                "category": "lab_result",
                "analysis_status": "completed",
                "lab_analysis": {
                    "summary": "LDL cholesterol is elevated.",
                    "normal_summary": "Triglycerides are within range.",
                    "abnormal_summary": "LDL is high.",
                    "next_steps": "Discuss cardiovascular risk.",
                },
            },
        ]
    )

    with patch("app.ai.tools._get_sync_db", return_value=db):
        result = search_patient_documents.invoke(
            {"patient_id": "patient-1", "query": "LDL cardiology"}
        )

    db.documents.find.assert_called_once_with({"patient_id": "patient-1"})
    assert "untrusted patient-document data" in result
    assert "Patient reported improved exercise tolerance" in result
    assert "LDL cholesterol is elevated" in result
    assert "#citation-document-doc-summary" in result
    assert "#citation-document-lab-1" in result


def test_search_patient_documents_handles_missing_summary_gracefully():
    db = MagicMock()
    db.users.find_one.return_value = {"user_id": "patient-1", "role": "patient"}
    db.documents.find.return_value = _cursor(
        [
            {
                "patient_id": "patient-1",
                "document_id": "scan-1",
                "filename": "scan.pdf",
                "category": "lab_result",
                "analysis_status": "queued",
                "lab_analysis": {},
                "extracted_text": "",
            }
        ]
    )

    with patch("app.ai.tools._get_sync_db", return_value=db):
        result = search_patient_documents.invoke(
            {"patient_id": "patient-1", "query": "scan"}
        )

    assert "queued" in result
    assert "no completed lab summary is available yet" in result
    assert "#citation-document-scan-1" in result


def test_search_patient_documents_scopes_specific_document_to_authorized_patient():
    db = MagicMock()
    db.users.find_one.return_value = {"user_id": "authorized-patient", "role": "patient"}
    db.documents.find.return_value = _cursor([])

    with patch("app.ai.tools._get_sync_db", return_value=db):
        result = search_patient_documents.invoke(
            {
                "patient_id": "authorized-patient",
                "document_id": "other-patient-doc",
            }
        )

    db.documents.find.assert_called_once_with(
        {
            "patient_id": "authorized-patient",
            "document_id": "other-patient-doc",
        }
    )
    assert "No uploaded documents were found" in result
