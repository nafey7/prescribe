"""Unit tests for the fetch_lab_results LangGraph tool.

Mock pattern mirrors test_api_documents.py: patch "app.ai.tools._get_sync_db".
Run: docker compose exec backend python -m pytest tests/test_lab_tool.py -v
"""
from unittest.mock import MagicMock, patch

import pytest

from app.ai.tools import _format_lab_results, fetch_lab_results


def _make_suggestion(*, document_id="doc-001", date="2026-04-15", results=None):
    return {
        "patient_id": "pat-001",
        "document_id": document_id,
        "category": "lab_result",
        "extracted_data": {
            "date": date,
            "results": results
            if results is not None
            else [
                {
                    "name": "HbA1c",
                    "value": "8.2",
                    "unit": "%",
                    "reference_range": "<5.7%",
                    "status": "HIGH",
                },
                {
                    "name": "Creatinine",
                    "value": "1.1",
                    "unit": "mg/dL",
                    "reference_range": "0.74–1.35 mg/dL",
                    "status": "Normal",
                },
            ],
        },
        "created_at": None,
    }


class TestFormatLabResults:
    def test_returns_notice_when_empty(self):
        result = _format_lab_results([])
        assert "No lab results have been extracted" in result

    def test_formats_values_and_flags(self):
        result = _format_lab_results([_make_suggestion()])
        assert "HbA1c" in result
        assert "8.2" in result
        assert "⚠ HIGH" in result
        assert "Creatinine" in result

    def test_handles_missing_fields_gracefully(self):
        s = _make_suggestion(results=[{"name": "TSH"}])
        result = _format_lab_results([s])
        assert "TSH" in result
        assert "N/A" in result

    def test_document_count_in_footer(self):
        result = _format_lab_results([_make_suggestion(), _make_suggestion(document_id="doc-002")])
        assert "2 lab documents found" in result


class TestFetchLabResultsTool:
    def _make_cursor(self, docs):
        """Return a mock cursor that behaves like pymongo's find().sort().limit()."""
        cursor = MagicMock()
        cursor.sort.return_value = cursor
        cursor.limit.return_value = cursor
        cursor.__iter__ = MagicMock(return_value=iter(docs))
        return cursor

    def test_returns_formatted_results(self):
        docs = [_make_suggestion()]
        mock_db = MagicMock()
        mock_db.suggestions.find.return_value = self._make_cursor(docs)

        with patch("app.ai.tools._get_sync_db", return_value=mock_db):
            result = fetch_lab_results.invoke({"patient_id": "pat-001"})

        assert "HbA1c" in result
        assert "Lab results on file" in result

    def test_filters_by_document_id(self):
        docs_a = [_make_suggestion(document_id="doc-001")]
        docs_b = [_make_suggestion(document_id="doc-002")]
        mock_db = MagicMock()

        def fake_find(query):
            doc_id = query.get("document_id")
            cursor = MagicMock()
            cursor.sort.return_value = cursor
            cursor.limit.return_value = cursor
            if doc_id == "doc-001":
                cursor.__iter__ = MagicMock(return_value=iter(docs_a))
            else:
                cursor.__iter__ = MagicMock(return_value=iter(docs_b))
            return cursor

        mock_db.suggestions.find.side_effect = fake_find

        with patch("app.ai.tools._get_sync_db", return_value=mock_db):
            result_a = fetch_lab_results.invoke({"patient_id": "pat-001", "document_id": "doc-001"})
            result_b = fetch_lab_results.invoke({"patient_id": "pat-001", "document_id": "doc-002"})

        assert "doc-001" in result_a
        assert "doc-002" not in result_a
        assert "doc-002" in result_b
        assert "doc-001" not in result_b

    def test_no_suggestions_returns_notice(self):
        mock_db = MagicMock()
        mock_db.suggestions.find.return_value = self._make_cursor([])

        with patch("app.ai.tools._get_sync_db", return_value=mock_db):
            result = fetch_lab_results.invoke({"patient_id": "pat-001"})

        assert "No lab results have been extracted" in result

    def test_db_unavailable_returns_error_string(self):
        with patch("app.ai.tools._get_sync_db", side_effect=Exception("Connection refused")):
            result = fetch_lab_results.invoke({"patient_id": "pat-001"})

        assert "temporarily unavailable" in result.lower()
        assert "Exception" in result or "Connection" in result or "unavailable" in result.lower()
