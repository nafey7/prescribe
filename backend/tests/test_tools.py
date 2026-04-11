import tempfile
from pathlib import Path
from unittest.mock import patch

from app.ai.tools import search_patient_records


def _make_settings(data_dir: str):
    class FakeSettings:
        PATIENT_DATA_DIR = data_dir
    return FakeSettings()


def test_search_existing_patient():
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "patient_john_doe.md"
        p.write_text("# John Doe\nHypertension, Diabetes")
        with patch("app.ai.tools.get_settings", return_value=_make_settings(tmp)):
            result = search_patient_records.invoke({"patient_id": "john_doe", "query": "medications"})
        assert "Hypertension" in result
        assert "Diabetes" in result


def test_search_missing_patient():
    with tempfile.TemporaryDirectory() as tmp:
        with patch("app.ai.tools.get_settings", return_value=_make_settings(tmp)):
            result = search_patient_records.invoke({"patient_id": "nonexistent", "query": ""})
        assert "No records found" in result


def test_search_empty_file():
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "patient_empty.md"
        p.write_text("")
        with patch("app.ai.tools.get_settings", return_value=_make_settings(tmp)):
            result = search_patient_records.invoke({"patient_id": "empty", "query": ""})
        assert "empty" in result.lower()
