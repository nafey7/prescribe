#!/usr/bin/env python3
"""One-time migration: Markdown patient files → MongoDB `users` collection.

Run from repo root with backend on PYTHONPATH, or from `backend/`:

  cd backend && PYTHONPATH=. python scripts/seed_patients.py

Requires MONGODB_URI and DATABASE_NAME (defaults match docker-compose).
"""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path

# `scripts/` → backend package root; parent of that → repo root (contains `data/patients`)
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_ROOT.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.config import get_settings  # noqa: E402
from app.database.connection import close_mongodb, connect_to_mongodb, get_database  # noqa: E402
from app.repository import patient as patient_repo  # noqa: E402
from app.schemas.patient import (  # noqa: E402
    Address,
    Allergy,
    Condition,
    EmergencyContact,
    FamilyHistoryEntry,
    Lifestyle,
    Medication,
    PatientProfileCreate,
)
from app.service import patient as patient_service  # noqa: E402


def _demographic_line(text: str, label: str) -> str | None:
    m = re.search(rf"- \*\*{re.escape(label)}:\*\*\s*(.+)", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return None


def _parse_weight_height_blood(text: str) -> tuple[float | None, float | None, str | None]:
    w = _demographic_line(text, "Weight")
    h = _demographic_line(text, "Height")
    bt = _demographic_line(text, "Blood Type")
    weight = None
    height = None
    if w:
        wm = re.search(r"([\d.]+)\s*kg", w, re.I)
        if wm:
            weight = float(wm.group(1))
    if h:
        hm = re.search(r"([\d.]+)\s*cm", h, re.I)
        if hm:
            height = float(hm.group(1))
    return weight, height, bt


def _parse_conditions(section: str) -> list[Condition]:
    conditions: list[Condition] = []
    if re.search(r"\*\*No chronic conditions\*\*", section, re.I):
        return conditions
    for m in re.finditer(
        r"\d+\.\s*\*\*([^*]+)\*\*\s*[—\-–]\s*([^\n]+)", section
    ):
        name = m.group(1).strip()
        rest = m.group(2).strip()
        year_m = re.search(r"(?:Diagnosed|diagnosed)\s+(\d{4})", rest)
        diagnosed_year = int(year_m.group(1)) if year_m else None
        conditions.append(
            Condition(
                name=name,
                diagnosed_year=diagnosed_year,
                status="active",
                notes=rest[:500],
            )
        )
    return conditions


def _parse_allergies(section: str) -> list[Allergy]:
    allergies: list[Allergy] = []
    for line in section.splitlines():
        line = line.strip()
        m = re.match(
            r"- \*\*([^*]+)\*\*\s*[—\-–]\s*(.+)", line
        )
        if m:
            substance = m.group(1).strip()
            rest = m.group(2).strip()
            doc_m = re.search(r"\(documented\s+([^)]+)\)", rest, re.I)
            documented_date = doc_m.group(1).strip() if doc_m else ""
            reaction = re.sub(r"\(documented[^)]*\)", "", rest, flags=re.I).strip()
            allergies.append(
                Allergy(
                    substance=substance,
                    reaction=reaction,
                    documented_date=documented_date,
                )
            )
    return allergies


def _parse_family_history(section: str) -> list[FamilyHistoryEntry]:
    entries: list[FamilyHistoryEntry] = []
    for line in section.splitlines():
        line = line.strip()
        m = re.match(r"-\s*([^:]+):\s*(.+)", line)
        if m:
            entries.append(
                FamilyHistoryEntry(
                    relation=m.group(1).strip(),
                    condition=m.group(2).strip(),
                )
            )
    return entries


def _parse_medications_table(section: str) -> list[Medication]:
    import re as _re
    rows: list[Medication] = []
    for line in section.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        if _re.match(r"^\|[\s\-:|]+\|$", line):
            continue
        parts = [p.strip() for p in line.split("|")]
        parts = [p for p in parts if p]
        if len(parts) < 4:
            continue
        med, dosage, freq, since = parts[0], parts[1], parts[2], parts[3]
        if med.lower() in ("medication", "none currently", "none"):
            continue
        if med in ("—", "–", "-"):
            continue
        since_clean = since if since not in ("—", "–", "-", "") else None
        rows.append(Medication(name=med, dosage=dosage, frequency=freq, since=since_clean))
    return rows


def _parse_lifestyle(section: str) -> Lifestyle:
    text = section.strip()
    smoking = "unknown"
    if re.search(r"Former smoker|former smoker", text):
        smoking = "former"
    elif re.search(r"Never smoked|non-smoker|non smoker", text, re.I):
        smoking = "never"
    elif re.search(r"smokes|smoking|pack-year", text, re.I):
        smoking = "current"

    alcohol = ""
    ex = re.search(r"Alcohol:\s*([^\n]+)", text, re.I)
    if ex:
        alcohol = ex.group(1).strip()
    exercise = ""
    ex2 = re.search(r"Exercise:\s*([^\n]+)", text, re.I)
    if ex2:
        exercise = ex2.group(1).strip()
    diet = ""
    ex3 = re.search(r"Diet:\s*([^\n]+)", text, re.I)
    if ex3:
        diet = ex3.group(1).strip()

    smoking_notes = ""
    sm = re.search(
        r"(Former smoker[^\n]+|Quit \d{4}[^\n]*)", text, re.I
    )
    if sm:
        smoking_notes = sm.group(0).strip()

    if not alcohol and not exercise and not diet and smoking == "unknown":
        return Lifestyle(
            smoking_status="unknown",
            smoking_notes=text[:2000] if text else "",
            alcohol="",
            exercise="",
            diet_notes="",
        )

    return Lifestyle(
        smoking_status=smoking,
        smoking_notes=smoking_notes,
        alcohol=alcohol,
        exercise=exercise,
        diet_notes=diet,
    )


def _extract_section(content: str, heading: str) -> str:
    pattern = rf"## {re.escape(heading)}\s*\n(.*?)(?=\n## |\Z)"
    m = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    return m.group(1).strip() if m else ""


def parse_patient_markdown(path: Path, slug: str) -> PatientProfileCreate:
    content = path.read_text(encoding="utf-8")
    demo = _extract_section(content, "Demographics")
    name_line = _demographic_line(demo, "Name") or ""
    parts = name_line.split()
    first_name = parts[0] if parts else slug
    last_name = " ".join(parts[1:]) if len(parts) > 1 else "Patient"

    sex_raw = (_demographic_line(demo, "Sex") or "").lower()
    sex = None
    if sex_raw in ("male", "female", "other"):
        sex = sex_raw
    elif "male" in sex_raw:
        sex = "male"
    elif "female" in sex_raw:
        sex = "female"

    weight_kg, height_cm, blood_type = _parse_weight_height_blood(demo)

    cond_section = _extract_section(content, "Active Conditions")
    conditions = _parse_conditions(cond_section)

    allergy_section = _extract_section(content, "Allergies")
    allergies = _parse_allergies(allergy_section)

    med_section = _extract_section(content, "Current Medications")
    medications = _parse_medications_table(med_section)

    fh_section = _extract_section(content, "Family History")
    family_history = _parse_family_history(fh_section)

    life_section = _extract_section(content, "Lifestyle")
    lifestyle = _parse_lifestyle(life_section)

    email = f"{slug}@patients.seed.local"

    return PatientProfileCreate(
        first_name=first_name,
        last_name=last_name,
        email=email,
        patient_slug=slug,
        date_of_birth=None,
        sex=sex,
        blood_type=blood_type,
        weight_kg=weight_kg,
        height_cm=height_cm,
        phone=None,
        address=Address(),
        emergency_contact=EmergencyContact(),
        allergies=allergies,
        conditions=conditions,
        medications=medications,
        family_history=family_history,
        lifestyle=lifestyle,
    )


def _resolve_patient_data_dir(settings) -> Path:
    rel = Path(settings.PATIENT_DATA_DIR)
    if rel.is_absolute():
        return rel
    under_backend = _BACKEND_ROOT / rel
    if under_backend.exists():
        return under_backend
    under_repo = _REPO_ROOT / rel
    if under_repo.exists():
        return under_repo
    return under_backend


async def main() -> None:
    settings = get_settings()
    data_dir = _resolve_patient_data_dir(settings)

    await connect_to_mongodb()
    db = get_database()

    files = sorted(data_dir.glob("patient_*.md"))
    mapping: list[tuple[str, str]] = []

    for f in files:
        slug = f.stem.replace("patient_", "")
        existing_slug = await patient_repo.get_patient_by_slug(db, slug)
        email = f"{slug}@patients.seed.local"
        existing_email = await patient_repo.get_patient_by_email(db, email)
        if existing_slug or existing_email:
            doc = existing_slug or existing_email
            print(f"Skip (exists): {slug} → user_id={doc.get('user_id')}")
            continue

        payload = parse_patient_markdown(f, slug)
        profile = await patient_service.register_patient(db, payload)
        mapping.append((slug, profile.user_id))
        print(f"Seeded: {slug} → user_id={profile.user_id}")

    print("--- slug → user_id mapping ---")
    for slug, uid in mapping:
        print(f"  {slug}: {uid}")

    await close_mongodb()


if __name__ == "__main__":
    asyncio.run(main())
