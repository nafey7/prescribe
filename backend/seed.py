"""
Seed script for Phase A development data.

Usage:
    cd backend && python -m seed

Populates the medical_chat database with realistic patient, doctor, admin,
relationship, prescription, and document records for local development.
"""

import asyncio
import sys
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings
from app.schemas.enums import (
    DocumentSource,
    DocumentType,
    DocumentVisibility,
    Gender,
    LinkRequestedBy,
    LinkStatus,
    PrescriptionStatus,
    UserRole,
    UserStatus,
)
from app.utils import (
    doctor_id,
    document_id,
    link_id,
    patient_id,
    prescription_id,
    user_id,
    utcnow,
)

NOW = utcnow()


def ts(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)


# ── Users ────────────────────────────────────────────────────────────────────

USR_JOHN = user_id()
USR_JANE = user_id()
USR_ALEX = user_id()
USR_SARAH = user_id()
USR_OMAR = user_id()
USR_ADMIN = user_id()

USERS = [
    {
        "user_id": USR_JOHN,
        "role": UserRole.PATIENT,
        "email": "john.doe@example.com",
        "phone": "+923001234567",
        "password_hash": None,
        "status": UserStatus.ACTIVE,
        "email_verified": False,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": ts("2026-03-01T10:00:00"),
        "updated_at": NOW,
    },
    {
        "user_id": USR_JANE,
        "role": UserRole.PATIENT,
        "email": "jane.smith@example.com",
        "phone": "+923009876543",
        "password_hash": None,
        "status": UserStatus.ACTIVE,
        "email_verified": False,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": ts("2026-03-05T14:00:00"),
        "updated_at": NOW,
    },
    {
        "user_id": USR_ALEX,
        "role": UserRole.PATIENT,
        "email": "alex.kumar@example.com",
        "phone": "+923005551234",
        "password_hash": None,
        "status": UserStatus.ACTIVE,
        "email_verified": False,
        "profile_completed": False,
        "last_login_at": None,
        "created_at": ts("2026-04-01T09:00:00"),
        "updated_at": NOW,
    },
    {
        "user_id": USR_SARAH,
        "role": UserRole.DOCTOR,
        "email": "dr.sarah.ahmed@example.com",
        "phone": "+923008887776",
        "password_hash": None,
        "status": UserStatus.ACTIVE,
        "email_verified": False,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": ts("2026-02-15T08:00:00"),
        "updated_at": NOW,
    },
    {
        "user_id": USR_OMAR,
        "role": UserRole.DOCTOR,
        "email": "dr.omar.khan@example.com",
        "phone": "+923007776665",
        "password_hash": None,
        "status": UserStatus.ACTIVE,
        "email_verified": False,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": ts("2026-02-20T11:00:00"),
        "updated_at": NOW,
    },
    {
        "user_id": USR_ADMIN,
        "role": UserRole.ADMIN,
        "email": "admin@prescribe.local",
        "phone": None,
        "password_hash": None,
        "status": UserStatus.ACTIVE,
        "email_verified": True,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": ts("2026-01-01T00:00:00"),
        "updated_at": NOW,
    },
]

# ── Patient profiles ─────────────────────────────────────────────────────────

PAT_JOHN = patient_id()
PAT_JANE = patient_id()
PAT_ALEX = patient_id()

PATIENT_PROFILES = [
    {
        "patient_id": PAT_JOHN,
        "user_id": USR_JOHN,
        "full_name": "John Doe",
        "date_of_birth": "1990-01-20",
        "gender": Gender.MALE,
        "blood_group": "O+",
        "phone": "+923001234567",
        "address": {"line1": "House 12, Street 5", "city": "Lahore", "country": "PK"},
        "emergency_contact": {
            "name": "Jane Doe",
            "phone": "+923009999999",
            "relation": "sister",
        },
        "medical_summary": {
            "allergies": ["penicillin"],
            "chronic_conditions": ["hypertension"],
            "notes": "Regular follow-up for blood pressure management",
        },
        "created_at": ts("2026-03-01T10:05:00"),
        "updated_at": NOW,
    },
    {
        "patient_id": PAT_JANE,
        "user_id": USR_JANE,
        "full_name": "Jane Smith",
        "date_of_birth": "1985-07-12",
        "gender": Gender.FEMALE,
        "blood_group": "A+",
        "phone": "+923009876543",
        "address": {"line1": "Flat 4B, Towers", "city": "Karachi", "country": "PK"},
        "emergency_contact": {
            "name": "Bob Smith",
            "phone": "+923001112233",
            "relation": "spouse",
        },
        "medical_summary": {
            "allergies": [],
            "chronic_conditions": ["type 2 diabetes"],
            "notes": "Managing with metformin since 2024",
        },
        "created_at": ts("2026-03-05T14:05:00"),
        "updated_at": NOW,
    },
    {
        "patient_id": PAT_ALEX,
        "user_id": USR_ALEX,
        "full_name": "Alex Kumar",
        "date_of_birth": "1998-11-03",
        "gender": Gender.MALE,
        "blood_group": "B+",
        "phone": "+923005551234",
        "address": {"line1": "Block C, DHA Phase 6", "city": "Lahore", "country": "PK"},
        "emergency_contact": {"name": "", "phone": "", "relation": ""},
        "medical_summary": {
            "allergies": ["sulfa drugs"],
            "chronic_conditions": [],
            "notes": "New patient, onboarding incomplete",
        },
        "created_at": ts("2026-04-01T09:05:00"),
        "updated_at": NOW,
    },
]

# ── Doctor profiles ──────────────────────────────────────────────────────────

DOC_SARAH = doctor_id()
DOC_OMAR = doctor_id()

DOCTOR_PROFILES = [
    {
        "doctor_id": DOC_SARAH,
        "user_id": USR_SARAH,
        "full_name": "Dr. Sarah Ahmed",
        "specialization": "Cardiology",
        "license_number": "PMC-123456",
        "years_of_experience": 8,
        "clinic_name": "City Heart Clinic",
        "phone": "+923008887776",
        "bio": "Cardiologist focused on preventive care and hypertension management.",
        "accepting_new_patients": True,
        "created_at": ts("2026-02-15T08:05:00"),
        "updated_at": NOW,
    },
    {
        "doctor_id": DOC_OMAR,
        "user_id": USR_OMAR,
        "full_name": "Dr. Omar Khan",
        "specialization": "Endocrinology",
        "license_number": "PMC-654321",
        "years_of_experience": 12,
        "clinic_name": "Khan Diabetes & Endo Center",
        "phone": "+923007776665",
        "bio": "Endocrinologist specializing in diabetes and thyroid disorders.",
        "accepting_new_patients": True,
        "created_at": ts("2026-02-20T11:05:00"),
        "updated_at": NOW,
    },
]

# ── Doctor-patient links ─────────────────────────────────────────────────────

LNK_1 = link_id()
LNK_2 = link_id()
LNK_3 = link_id()
LNK_4 = link_id()

LINKS = [
    {
        "link_id": LNK_1,
        "patient_id": PAT_JOHN,
        "doctor_id": DOC_SARAH,
        "status": LinkStatus.ACTIVE,
        "requested_by": LinkRequestedBy.PATIENT,
        "requested_at": ts("2026-03-10T09:00:00"),
        "responded_at": ts("2026-03-10T12:00:00"),
        "accepted_at": ts("2026-03-10T12:00:00"),
        "rejected_at": None,
        "ended_at": None,
        "notes": None,
        "created_at": ts("2026-03-10T09:00:00"),
        "updated_at": ts("2026-03-10T12:00:00"),
    },
    {
        "link_id": LNK_2,
        "patient_id": PAT_JANE,
        "doctor_id": DOC_OMAR,
        "status": LinkStatus.ACTIVE,
        "requested_by": LinkRequestedBy.PATIENT,
        "requested_at": ts("2026-03-12T10:00:00"),
        "responded_at": ts("2026-03-12T15:00:00"),
        "accepted_at": ts("2026-03-12T15:00:00"),
        "rejected_at": None,
        "ended_at": None,
        "notes": None,
        "created_at": ts("2026-03-12T10:00:00"),
        "updated_at": ts("2026-03-12T15:00:00"),
    },
    {
        "link_id": LNK_3,
        "patient_id": PAT_ALEX,
        "doctor_id": DOC_SARAH,
        "status": LinkStatus.PENDING_PATIENT_REQUEST,
        "requested_by": LinkRequestedBy.PATIENT,
        "requested_at": ts("2026-04-05T08:00:00"),
        "responded_at": None,
        "accepted_at": None,
        "rejected_at": None,
        "ended_at": None,
        "notes": "New patient requesting cardiology consultation",
        "created_at": ts("2026-04-05T08:00:00"),
        "updated_at": ts("2026-04-05T08:00:00"),
    },
    {
        "link_id": LNK_4,
        "patient_id": PAT_JOHN,
        "doctor_id": DOC_OMAR,
        "status": LinkStatus.ACTIVE,
        "requested_by": LinkRequestedBy.DOCTOR,
        "requested_at": ts("2026-03-20T11:00:00"),
        "responded_at": ts("2026-03-20T18:00:00"),
        "accepted_at": ts("2026-03-20T18:00:00"),
        "rejected_at": None,
        "ended_at": None,
        "notes": "Referred by Dr. Sarah for endocrine evaluation",
        "created_at": ts("2026-03-20T11:00:00"),
        "updated_at": ts("2026-03-20T18:00:00"),
    },
]

# ── Prescriptions ────────────────────────────────────────────────────────────

RX_1 = prescription_id()
RX_2 = prescription_id()

PRESCRIPTIONS = [
    {
        "prescription_id": RX_1,
        "patient_id": PAT_JOHN,
        "doctor_id": DOC_SARAH,
        "created_by_user_id": USR_SARAH,
        "status": PrescriptionStatus.ACTIVE,
        "diagnosis_summary": "Hypertension follow-up",
        "notes": "Monitor blood pressure daily. Recheck in 4 weeks.",
        "medications": [
            {
                "name": "Amlodipine",
                "dosage": "5mg",
                "frequency": "once daily",
                "duration": "30 days",
                "instructions": "Take after breakfast",
            },
            {
                "name": "Losartan",
                "dosage": "50mg",
                "frequency": "once daily",
                "duration": "30 days",
                "instructions": "Take before bed",
            },
        ],
        "attachments": [],
        "issued_at": ts("2026-03-15T10:30:00"),
        "created_at": ts("2026-03-15T10:30:00"),
        "updated_at": ts("2026-03-15T10:30:00"),
    },
    {
        "prescription_id": RX_2,
        "patient_id": PAT_JANE,
        "doctor_id": DOC_OMAR,
        "created_by_user_id": USR_OMAR,
        "status": PrescriptionStatus.ACTIVE,
        "diagnosis_summary": "Type 2 diabetes management",
        "notes": "Continue metformin. HbA1c test in 3 months.",
        "medications": [
            {
                "name": "Metformin",
                "dosage": "500mg",
                "frequency": "twice daily",
                "duration": "90 days",
                "instructions": "Take with meals",
            },
        ],
        "attachments": [],
        "issued_at": ts("2026-03-18T14:00:00"),
        "created_at": ts("2026-03-18T14:00:00"),
        "updated_at": ts("2026-03-18T14:00:00"),
    },
]

# ── Patient documents ────────────────────────────────────────────────────────

DOCU_1 = document_id()
DOCU_2 = document_id()
DOCU_3 = document_id()

DOCUMENTS = [
    {
        "document_id": DOCU_1,
        "patient_id": PAT_JOHN,
        "uploaded_by_user_id": USR_JOHN,
        "document_type": DocumentType.LAB_REPORT,
        "title": "CBC Report - March 2026",
        "description": "Complete blood count routine checkup",
        "file_name": "cbc-march-2026.pdf",
        "storage_key": f"patients/{PAT_JOHN}/docs/cbc-march-2026.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 245198,
        "visibility": DocumentVisibility.LINKED_DOCTORS,
        "source": DocumentSource.PATIENT_UPLOAD,
        "uploaded_at": ts("2026-03-08T16:00:00"),
        "created_at": ts("2026-03-08T16:00:00"),
        "updated_at": ts("2026-03-08T16:00:00"),
    },
    {
        "document_id": DOCU_2,
        "patient_id": PAT_JOHN,
        "uploaded_by_user_id": USR_JOHN,
        "document_type": DocumentType.MEDICAL_TEST,
        "title": "ECG Report - March 2026",
        "description": "Electrocardiogram, ordered by Dr. Sarah",
        "file_name": "ecg-march-2026.pdf",
        "storage_key": f"patients/{PAT_JOHN}/docs/ecg-march-2026.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 512000,
        "visibility": DocumentVisibility.LINKED_DOCTORS,
        "source": DocumentSource.PATIENT_UPLOAD,
        "uploaded_at": ts("2026-03-12T11:00:00"),
        "created_at": ts("2026-03-12T11:00:00"),
        "updated_at": ts("2026-03-12T11:00:00"),
    },
    {
        "document_id": DOCU_3,
        "patient_id": PAT_JANE,
        "uploaded_by_user_id": USR_JANE,
        "document_type": DocumentType.LAB_REPORT,
        "title": "HbA1c Report - February 2026",
        "description": "Glycated hemoglobin test for diabetes monitoring",
        "file_name": "hba1c-feb-2026.pdf",
        "storage_key": f"patients/{PAT_JANE}/docs/hba1c-feb-2026.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 198400,
        "visibility": DocumentVisibility.LINKED_DOCTORS,
        "source": DocumentSource.PATIENT_UPLOAD,
        "uploaded_at": ts("2026-02-28T09:00:00"),
        "created_at": ts("2026-02-28T09:00:00"),
        "updated_at": ts("2026-02-28T09:00:00"),
    },
]


# ── Seed runner ──────────────────────────────────────────────────────────────


async def seed() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    collections = {
        "users": USERS,
        "patient_profiles": PATIENT_PROFILES,
        "doctor_profiles": DOCTOR_PROFILES,
        "doctor_patient_links": LINKS,
        "prescriptions": PRESCRIPTIONS,
        "patient_documents": DOCUMENTS,
    }

    for name, docs in collections.items():
        coll = db[name]
        existing = await coll.count_documents({})
        if existing > 0:
            print(f"  ⏭  {name}: already has {existing} docs, skipping")
            continue
        if docs:
            await coll.insert_many(docs)
            print(f"  ✓  {name}: inserted {len(docs)} docs")

    client.close()
    print("\nSeed complete.")


if __name__ == "__main__":
    print("Seeding Phase A development data…\n")
    try:
        asyncio.run(seed())
    except Exception as exc:
        print(f"\nSeed failed: {exc}", file=sys.stderr)
        sys.exit(1)
