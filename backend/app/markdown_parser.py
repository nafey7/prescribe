"""Read-only parser for legacy `data/patients/patient_{slug}.md` files."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from app.config import get_settings


@dataclass
class MedicationRow:
    name: str
    dosage: str
    frequency: str
    since: str | None = None


@dataclass
class LabResultRow:
    name: str
    value: str
    status: str = "normal"
    reference_range: str | None = None


@dataclass
class LabReportRow:
    date: str
    results: list[LabResultRow]


@dataclass
class MedicalEventRow:
    year: int
    description: str


@dataclass
class ParsedPatientMarkdown:
    medications: list[MedicationRow] = field(default_factory=list)
    lab_reports: list[LabReportRow] = field(default_factory=list)
    medical_events: list[MedicalEventRow] = field(default_factory=list)
    raw_sections: dict[str, str] = field(default_factory=dict)


_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_ROOT.parent


def resolve_patient_data_dir() -> Path:
    rel = Path(get_settings().PATIENT_DATA_DIR)
    if rel.is_absolute():
        return rel
    under_backend = _BACKEND_ROOT / rel
    if under_backend.exists():
        return under_backend
    under_repo = _REPO_ROOT / rel
    if under_repo.exists():
        return under_repo
    return under_backend


def _split_sections(content: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    pattern = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
    matches = list(pattern.finditer(content))
    for i, m in enumerate(matches):
        title = m.group(1).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        sections[title] = content[start:end].strip()
    return sections


def _parse_medications_table(section: str) -> list[MedicationRow]:
    rows: list[MedicationRow] = []
    for line in section.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[\s\-:|]+\|$", line):
            continue
        parts = [p.strip() for p in line.split("|")]
        parts = [p for p in parts if p]
        if len(parts) < 4:
            continue
        med, dosage, freq, since = parts[0], parts[1], parts[2], parts[3]
        if med.lower() in ("medication", "none currently", "none"):
            continue
        if med in ("—", "–", "-") or dosage in ("—", "–", "-") and "none" in med.lower():
            continue
        since_clean = since if since not in ("—", "–", "-", "") else None
        rows.append(
            MedicationRow(
                name=med,
                dosage=dosage,
                frequency=freq,
                since=since_clean,
            )
        )
    return rows


_STATUS_MAP = [
    (re.compile(r"elevated|high|above target|borderline high", re.I), "elevated"),
    (re.compile(r"low|insufficient|below", re.I), "low"),
    (re.compile(r"critical|severe", re.I), "critical"),
    (re.compile(r"normal|stable|within", re.I), "normal"),
]


def _infer_status(text: str) -> str:
    tail = text.lower()
    for rx, st in _STATUS_MAP:
        if rx.search(tail):
            return st
    return "normal"


def _parse_lab_line(line: str) -> LabResultRow | None:
    line = line.strip()
    m = re.match(r"^[-*]\s+(.+?):\s*(.+)$", line)
    if not m:
        return None
    name = m.group(1).strip()
    rest = m.group(2).strip()
    if len(name) > 80 or "otherwise" in rest.lower():
        return None
    paren = re.search(r"\(([^)]+)\)\s*$", rest)
    status = "normal"
    value = rest
    if paren:
        inner = paren.group(1).strip()
        value = rest[: paren.start()].strip()
        status = _infer_status(inner)
    else:
        status = _infer_status(rest)
    return LabResultRow(name=name, value=value, status=status, reference_range=None)


def _parse_lab_section(title: str, body: str) -> LabReportRow | None:
    date_m = re.search(r"\(([^)]+)\)\s*$", title)
    date_label = date_m.group(1).strip() if date_m else title.replace("Recent Lab Results", "").strip()
    if not date_label:
        date_label = "Unknown date"
    results: list[LabResultRow] = []
    for line in body.splitlines():
        parsed = _parse_lab_line(line)
        if parsed:
            results.append(parsed)
    if not results:
        return None
    return LabReportRow(date=date_label, results=results)


def _parse_medical_history(section: str) -> list[MedicalEventRow]:
    events: list[MedicalEventRow] = []
    for line in section.splitlines():
        line = line.strip()
        m = re.match(r"^[-*]\s*(\d{4})\s*:\s*(.+)$", line)
        if m:
            events.append(
                MedicalEventRow(year=int(m.group(1)), description=m.group(2).strip())
            )
    events.sort(key=lambda e: e.year, reverse=True)
    return events


def parse_patient_markdown_file(path: Path) -> ParsedPatientMarkdown:
    content = path.read_text(encoding="utf-8")
    sections = _split_sections(content)
    raw = {k: v for k, v in sections.items()}

    meds: list[MedicationRow] = []
    for key, body in sections.items():
        if key.lower().startswith("current medications"):
            meds = _parse_medications_table(body)
            break

    lab_reports: list[LabReportRow] = []
    for key, body in sections.items():
        if key.lower().startswith("recent lab results"):
            report = _parse_lab_section(key, body)
            if report:
                lab_reports.append(report)
            break

    med_events: list[MedicalEventRow] = []
    for key, body in sections.items():
        if key.lower() == "medical history":
            med_events = _parse_medical_history(body)
            break

    return ParsedPatientMarkdown(
        medications=meds,
        lab_reports=lab_reports,
        medical_events=med_events,
        raw_sections=raw,
    )


def parse_patient_markdown(patient_slug: str) -> ParsedPatientMarkdown:
    data_dir = resolve_patient_data_dir()
    path = data_dir / f"patient_{patient_slug}.md"
    if not path.is_file():
        return ParsedPatientMarkdown()
    return parse_patient_markdown_file(path)
