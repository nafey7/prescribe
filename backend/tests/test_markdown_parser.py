"""Unit tests for legacy patient Markdown parsing."""

from pathlib import Path

import pytest

from app.markdown_parser import (
    parse_patient_markdown,
    parse_patient_markdown_file,
    resolve_patient_data_dir,
)


def test_resolve_patient_data_dir_exists():
    d = resolve_patient_data_dir()
    assert d.is_dir()
    assert any(d.glob("patient_*.md"))


def test_parse_john_doe_medications():
    p = parse_patient_markdown("john_doe")
    assert len(p.medications) == 4
    assert p.medications[0].name == "Lisinopril"
    assert "20" in p.medications[0].dosage


def test_parse_john_doe_labs_and_status():
    p = parse_patient_markdown("john_doe")
    assert len(p.lab_reports) == 1
    report = p.lab_reports[0]
    assert "2025" in report.date or "January" in report.date
    names = {r.name for r in report.results}
    assert "Fasting glucose" in names or "LDL" in names
    glucose = next((x for x in report.results if "glucose" in x.name.lower()), None)
    assert glucose is not None
    assert glucose.status in ("elevated", "normal")


def test_parse_john_doe_medical_events_order():
    p = parse_patient_markdown("john_doe")
    years = [e.year for e in p.medical_events]
    assert years == sorted(years, reverse=True)


def test_parse_missing_patient_returns_empty():
    p = parse_patient_markdown("totally_missing_slug_xyz")
    assert p.medications == []
    assert p.lab_reports == []
    assert p.medical_events == []


def test_parse_alex_no_labs():
    p = parse_patient_markdown("alex_kumar")
    assert p.lab_reports == []


@pytest.mark.parametrize("slug", ["john_doe", "jane_smith", "alex_kumar"])
def test_parse_each_seed_slug(slug: str):
    p = parse_patient_markdown(slug)
    assert isinstance(p.raw_sections, dict)
    assert len(p.raw_sections) >= 3


def test_parse_file_direct(tmp_path: Path):
    src = resolve_patient_data_dir() / "patient_john_doe.md"
    f = tmp_path / "copy.md"
    f.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    p = parse_patient_markdown_file(f)
    assert len(p.medications) >= 1
