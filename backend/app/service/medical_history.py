from datetime import date, datetime

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import patient as patient_repo
from app.repository.document import document_to_summary, list_documents_for_patient
from app.schemas.medical_history import (
    DocumentSummary,
    LabReport,
    LabResult,
    MedicalEvent,
    MedicalHistoryResponse,
    Medication,
    PatientSummary,
)
from app.schemas.patient import (
    Allergy,
    Condition,
    FamilyHistoryEntry,
    Lifestyle,
    Medication as PatientMedication,
    document_to_profile_response,
)
from app.utils.markdown_parser import parse_patient_markdown


def _age_from_dob(date_of_birth: str | None) -> int | None:
    if not date_of_birth:
        return None
    try:
        raw = date_of_birth[:10]
        born = datetime.strptime(raw, "%Y-%m-%d").date()
        today = date.today()
        years = today.year - born.year - (
            (today.month, today.day) < (born.month, born.day)
        )
        return years if years >= 0 else None
    except (ValueError, TypeError):
        return None


def _build_summary(patient_doc: dict) -> PatientSummary:
    profile = patient_doc.get("patient_profile") or {}
    pr = document_to_profile_response(patient_doc)
    return PatientSummary(
        first_name=pr.first_name,
        last_name=pr.last_name,
        age=_age_from_dob(profile.get("date_of_birth")),
        sex=pr.sex,
        blood_type=pr.blood_type,
        weight_kg=pr.weight_kg,
        height_cm=pr.height_cm,
    )


async def get_medical_history(
    db: AsyncIOMotorDatabase, patient_id: str
) -> MedicalHistoryResponse:
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    user_id = doc["user_id"]
    slug = doc.get("patient_slug") or patient_id
    profile = doc.get("patient_profile") or {}

    md = parse_patient_markdown(slug)

    raw_docs = await list_documents_for_patient(db, user_id, limit=5)
    recent_documents = [
        DocumentSummary(**document_to_summary(d)) for d in raw_docs
    ]

    db_meds = [
        Medication.model_validate(m)
        for m in profile.get("medications") or []
    ]
    md_meds = [
        Medication(
            name=m.name,
            dosage=m.dosage,
            frequency=m.frequency,
            since=m.since,
        )
        for m in md.medications
    ]
    db_med_names = {m.name.lower() for m in db_meds}
    medications = db_meds + [m for m in md_meds if m.name.lower() not in db_med_names]

    lab_reports = [
        LabReport(
            date=r.date,
            results=[
                LabResult(
                    name=x.name,
                    value=x.value,
                    status=x.status,
                    reference_range=x.reference_range,
                )
                for x in r.results
            ],
        )
        for r in md.lab_reports
    ]

    medical_events = [
        MedicalEvent(year=e.year, description=e.description) for e in md.medical_events
    ]

    lifestyle: Lifestyle | None = None
    if profile.get("lifestyle"):
        lifestyle = Lifestyle.model_validate(profile["lifestyle"])

    return MedicalHistoryResponse(
        patient_id=user_id,
        summary=_build_summary(doc),
        conditions=[Condition.model_validate(c) for c in profile.get("conditions") or []],
        allergies=[Allergy.model_validate(a) for a in profile.get("allergies") or []],
        medications=medications,
        lab_reports=lab_reports,
        medical_events=medical_events,
        family_history=[
            FamilyHistoryEntry.model_validate(f)
            for f in profile.get("family_history") or []
        ],
        lifestyle=lifestyle,
        recent_documents=recent_documents,
    )
