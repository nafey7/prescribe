"""
Seed script for local development data.

Usage:
    cd backend && python -m seed

Also runs automatically after MongoDB connects on API startup when
`DEV_DEFAULT_PASSWORD` is set: if all seed users already exist, seeding is skipped.

Creates demo patients, doctors, an admin, doctor–patient connections (active and
pending), sample prescriptions, and patient_documents rows. Uses the same
`users` + `connections` collections as the running app.

Password hashes use the same bcrypt path as the API (`hash_password` +
`BCRYPT_ROUNDS` from settings / `.env`). Set `DEV_DEFAULT_PASSWORD` (min 8 chars,
letter + digit; same rules as signup) so seed accounts can log in immediately.
Optional per-email override: `DEV_PASSWORD_<EMAIL_UPPER_WITH_UNDERSCORES>` (see
`app.scripts.set_dev_passwords`).

CLI runs are idempotent for recovery: missing rows are inserted; existing rows
with the same ids are replaced. Startup seed skips entirely when every seed
user row is already present.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import sys
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings
from app.schemas.enums import (
    DocumentSource,
    DocumentType,
    DocumentVisibility,
    PrescriptionStatus,
    UserRole,
    UserStatus,
    ConnectionStatus,
)
from app.schemas.auth import validate_password_strength
from app.scripts.seed_manifest import SEED_SOURCE_TAG, stable_seed_uuid
from app.service.auth import hash_password
from app.utils import utcnow

logger = logging.getLogger(__name__)

NOW = utcnow()


def _dev_password_override_env_name(email: str) -> str:
    safe = re.sub(r"[^A-Z0-9]+", "_", email.upper()).strip("_")
    return f"DEV_PASSWORD_{safe}"


def _resolve_plain_password(email: str, default: str) -> str:
    return os.environ.get(_dev_password_override_env_name(email), default)


def ts(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)


# ── Stable user ids (deterministic across runs) ─────────────────────────────

USR_JOHN = stable_seed_uuid("user:patient:john@example.com")
USR_JANE = stable_seed_uuid("user:patient:jane@example.com")
USR_ALEX = stable_seed_uuid("user:patient:alex@example.com")
USR_SARAH = stable_seed_uuid("user:doctor:sarah@example.com")
USR_OMAR = stable_seed_uuid("user:doctor:omar@example.com")
USR_ADMIN = stable_seed_uuid("user:admin:admin@example.com")

ALL_SEED_USER_IDS: tuple[str, ...] = (
    USR_JOHN,
    USR_JANE,
    USR_ALEX,
    USR_SARAH,
    USR_OMAR,
    USR_ADMIN,
)


def _patient_user(
    *,
    user_id: str,
    email: str,
    patient_slug: str,
    first_name: str,
    last_name: str,
    date_of_birth: str | None,
    sex: str | None,
    blood_type: str | None,
    phone: str | None,
    profile_completed: bool,
    created_at: datetime,
) -> dict:
    return {
        "user_id": user_id,
        "role": UserRole.PATIENT.value,
        "email": email,
        "patient_slug": patient_slug,
        "password_hash": None,
        "token_version": 0,
        "status": UserStatus.ACTIVE.value,
        "email_verified": False,
        "profile_completed": profile_completed,
        "last_login_at": None,
        "created_at": created_at,
        "updated_at": NOW,
        "seed_source": SEED_SOURCE_TAG,
        "patient_profile": {
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": date_of_birth,
            "sex": sex,
            "blood_type": blood_type,
            "weight_kg": None,
            "height_cm": None,
            "phone": phone,
            "address": {"street": "", "city": "", "state": "", "zip": ""},
            "emergency_contact": {"name": "", "relationship": "", "phone": ""},
            "allergies": [],
            "conditions": [],
            "medications": [],
            "family_history": [],
            "lifestyle": {
                "smoking_status": "unknown",
                "smoking_notes": "",
                "alcohol": "",
                "exercise": "",
                "diet_notes": "",
            },
        },
    }


def _doctor_user(
    *,
    user_id: str,
    email: str,
    first_name: str,
    last_name: str,
    specialization: str,
    license_number: str,
    years_of_experience: int,
    institution: str,
    phone: str,
    bio: str,
    created_at: datetime,
) -> dict:
    return {
        "user_id": user_id,
        "role": UserRole.DOCTOR.value,
        "email": email,
        "password_hash": None,
        "token_version": 0,
        "status": UserStatus.ACTIVE.value,
        "email_verified": False,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": created_at,
        "updated_at": NOW,
        "seed_source": SEED_SOURCE_TAG,
        "doctor_profile": {
            "first_name": first_name,
            "last_name": last_name,
            "title": "Dr.",
            "specialization": specialization,
            "sub_specializations": [],
            "license_number": license_number,
            "license_state": "",
            "npi_number": "",
            "institution": institution,
            "department": specialization,
            "years_of_experience": years_of_experience,
            "education": [],
            "phone": phone,
            "office_address": {"street": "", "city": "", "state": "", "zip": ""},
            "accepting_new_patients": True,
            "bio": bio,
        },
    }


SEED_USERS: list[dict] = [
    _patient_user(
        user_id=USR_JOHN,
        email="john@example.com",
        patient_slug="john_doe",
        first_name="John",
        last_name="Doe",
        date_of_birth="1990-01-20",
        sex="male",
        blood_type="O+",
        phone="+923001234567",
        profile_completed=True,
        created_at=ts("2026-03-01T10:00:00"),
    ),
    _patient_user(
        user_id=USR_JANE,
        email="jane@example.com",
        patient_slug="jane_smith",
        first_name="Jane",
        last_name="Smith",
        date_of_birth="1985-07-12",
        sex="female",
        blood_type="A+",
        phone="+923009876543",
        profile_completed=True,
        created_at=ts("2026-03-05T14:00:00"),
    ),
    _patient_user(
        user_id=USR_ALEX,
        email="alex@example.com",
        patient_slug="alex_kumar",
        first_name="Alex",
        last_name="Kumar",
        date_of_birth="1998-11-03",
        sex="male",
        blood_type="B+",
        phone="+923005551234",
        profile_completed=False,
        created_at=ts("2026-04-01T09:00:00"),
    ),
    _doctor_user(
        user_id=USR_SARAH,
        email="sarah@example.com",
        first_name="Sarah",
        last_name="Ahmed",
        specialization="Cardiology",
        license_number="PMC-123456",
        years_of_experience=8,
        institution="City Heart Clinic",
        phone="+923008887776",
        bio="Cardiologist focused on preventive care and hypertension management.",
        created_at=ts("2026-02-15T08:00:00"),
    ),
    _doctor_user(
        user_id=USR_OMAR,
        email="omar@example.com",
        first_name="Omar",
        last_name="Khan",
        specialization="Endocrinology",
        license_number="PMC-654321",
        years_of_experience=12,
        institution="Khan Diabetes & Endo Center",
        phone="+923007776665",
        bio="Endocrinologist specializing in diabetes and thyroid disorders.",
        created_at=ts("2026-02-20T11:00:00"),
    ),
    {
        "user_id": USR_ADMIN,
        "role": UserRole.ADMIN.value,
        "email": "admin@example.com",
        "first_name": "Local",
        "last_name": "Admin",
        "phone": None,
        "password_hash": None,
        "token_version": 0,
        "status": UserStatus.ACTIVE.value,
        "email_verified": True,
        "profile_completed": True,
        "last_login_at": None,
        "created_at": ts("2026-01-01T00:00:00"),
        "updated_at": NOW,
        "seed_source": SEED_SOURCE_TAG,
    },
]

# connection_id stable per (patient user_id, doctor user_id)
CONN_JOHN_SARAH = stable_seed_uuid(f"conn:{USR_JOHN}:{USR_SARAH}")
CONN_JANE_OMAR = stable_seed_uuid(f"conn:{USR_JANE}:{USR_OMAR}")
CONN_ALEX_SARAH = stable_seed_uuid(f"conn:{USR_ALEX}:{USR_SARAH}")
CONN_JOHN_OMAR = stable_seed_uuid(f"conn:{USR_JOHN}:{USR_OMAR}")

SEED_CONNECTIONS: list[dict] = [
    {
        "connection_id": CONN_JOHN_SARAH,
        "doctor_id": USR_SARAH,
        "patient_id": USR_JOHN,
        "status": ConnectionStatus.ACTIVE.value,
        "initiated_by": "patient",
        "initiated_at": ts("2026-03-10T09:00:00"),
        "responded_at": ts("2026-03-10T12:00:00"),
        "removed_at": None,
        "removed_by": None,
        "created_at": ts("2026-03-10T09:00:00"),
        "updated_at": ts("2026-03-10T12:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
    {
        "connection_id": CONN_JANE_OMAR,
        "doctor_id": USR_OMAR,
        "patient_id": USR_JANE,
        "status": ConnectionStatus.ACTIVE.value,
        "initiated_by": "patient",
        "initiated_at": ts("2026-03-12T10:00:00"),
        "responded_at": ts("2026-03-12T15:00:00"),
        "removed_at": None,
        "removed_by": None,
        "created_at": ts("2026-03-12T10:00:00"),
        "updated_at": ts("2026-03-12T15:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
    {
        "connection_id": CONN_ALEX_SARAH,
        "doctor_id": USR_SARAH,
        "patient_id": USR_ALEX,
        "status": ConnectionStatus.PENDING.value,
        "initiated_by": "patient",
        "initiated_at": ts("2026-04-05T08:00:00"),
        "responded_at": None,
        "removed_at": None,
        "removed_by": None,
        "created_at": ts("2026-04-05T08:00:00"),
        "updated_at": ts("2026-04-05T08:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
    {
        "connection_id": CONN_JOHN_OMAR,
        "doctor_id": USR_OMAR,
        "patient_id": USR_JOHN,
        "status": ConnectionStatus.ACTIVE.value,
        "initiated_by": "doctor",
        "initiated_at": ts("2026-03-20T11:00:00"),
        "responded_at": ts("2026-03-20T18:00:00"),
        "removed_at": None,
        "removed_by": None,
        "created_at": ts("2026-03-20T11:00:00"),
        "updated_at": ts("2026-03-20T18:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
]

RX_1 = stable_seed_uuid("rx:john:sarah:1")
RX_2 = stable_seed_uuid("rx:jane:omar:1")

SEED_PRESCRIPTIONS: list[dict] = [
    {
        "prescription_id": RX_1,
        "patient_id": USR_JOHN,
        "doctor_id": USR_SARAH,
        "created_by_user_id": USR_SARAH,
        "status": PrescriptionStatus.ACTIVE.value,
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
        "seed_source": SEED_SOURCE_TAG,
    },
    {
        "prescription_id": RX_2,
        "patient_id": USR_JANE,
        "doctor_id": USR_OMAR,
        "created_by_user_id": USR_OMAR,
        "status": PrescriptionStatus.ACTIVE.value,
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
        "seed_source": SEED_SOURCE_TAG,
    },
]

DOCU_1 = stable_seed_uuid("pdoc:john:cbc")
DOCU_2 = stable_seed_uuid("pdoc:john:ecg")
DOCU_3 = stable_seed_uuid("pdoc:jane:hba1c")

SEED_PATIENT_DOCUMENTS: list[dict] = [
    {
        "document_id": DOCU_1,
        "patient_id": USR_JOHN,
        "uploaded_by_user_id": USR_JOHN,
        "document_type": DocumentType.LAB_REPORT.value,
        "title": "CBC Report - March 2026",
        "description": "Complete blood count routine checkup",
        "file_name": "cbc-march-2026.pdf",
        "storage_key": f"patients/{USR_JOHN}/docs/cbc-march-2026.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 245198,
        "visibility": DocumentVisibility.LINKED_DOCTORS.value,
        "source": DocumentSource.PATIENT_UPLOAD.value,
        "uploaded_at": ts("2026-03-08T16:00:00"),
        "created_at": ts("2026-03-08T16:00:00"),
        "updated_at": ts("2026-03-08T16:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
    {
        "document_id": DOCU_2,
        "patient_id": USR_JOHN,
        "uploaded_by_user_id": USR_JOHN,
        "document_type": DocumentType.MEDICAL_TEST.value,
        "title": "ECG Report - March 2026",
        "description": "Electrocardiogram, ordered by Dr. Sarah",
        "file_name": "ecg-march-2026.pdf",
        "storage_key": f"patients/{USR_JOHN}/docs/ecg-march-2026.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 512000,
        "visibility": DocumentVisibility.LINKED_DOCTORS.value,
        "source": DocumentSource.PATIENT_UPLOAD.value,
        "uploaded_at": ts("2026-03-12T11:00:00"),
        "created_at": ts("2026-03-12T11:00:00"),
        "updated_at": ts("2026-03-12T11:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
    {
        "document_id": DOCU_3,
        "patient_id": USR_JANE,
        "uploaded_by_user_id": USR_JANE,
        "document_type": DocumentType.LAB_REPORT.value,
        "title": "HbA1c Report - February 2026",
        "description": "Glycated hemoglobin test for diabetes monitoring",
        "file_name": "hba1c-feb-2026.pdf",
        "storage_key": f"patients/{USR_JANE}/docs/hba1c-feb-2026.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 198400,
        "visibility": DocumentVisibility.LINKED_DOCTORS.value,
        "source": DocumentSource.PATIENT_UPLOAD.value,
        "uploaded_at": ts("2026-02-28T09:00:00"),
        "created_at": ts("2026-02-28T09:00:00"),
        "updated_at": ts("2026-02-28T09:00:00"),
        "seed_source": SEED_SOURCE_TAG,
    },
]


async def _is_dev_seed_complete(db: AsyncIOMotorDatabase) -> bool:
    n = await db.users.count_documents({"user_id": {"$in": list(ALL_SEED_USER_IDS)}})
    return n == len(ALL_SEED_USER_IDS)


async def seed(
    *,
    db: AsyncIOMotorDatabase | None = None,
    require_dev_password: bool = True,
) -> bool:
    """
    Insert development seed rows. Returns True if data was written, False if skipped.

    When ``require_dev_password`` is False (API startup), missing
    ``DEV_DEFAULT_PASSWORD`` skips seeding without error. When True (CLI),
    missing password raises ``ValueError``.
    """
    settings = get_settings()
    default_raw = os.environ.get("DEV_DEFAULT_PASSWORD")
    if not default_raw:
        if require_dev_password:
            raise ValueError(
                "DEV_DEFAULT_PASSWORD is required to set bcrypt hashes for seed users "
                "(min 8 chars, letter + digit). Export it or add it to .env before seeding."
            )
        logger.info(
            "DEV_DEFAULT_PASSWORD not set; skipping automatic development seed."
        )
        return False

    validate_password_strength(default_raw)

    own_client: AsyncIOMotorClient | None = None
    if db is None:
        own_client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = own_client[settings.DATABASE_NAME]

    try:
        if await _is_dev_seed_complete(db):
            logger.info("Development seed data already present; skipping.")
            return False

        rounds = settings.BCRYPT_ROUNDS
        seeded_users: list[dict] = []
        for doc in SEED_USERS:
            email = doc["email"]
            plain = _resolve_plain_password(email, default_raw)
            validate_password_strength(plain)
            pwd_hash = hash_password(plain, rounds=rounds)
            seeded_users.append({**doc, "password_hash": pwd_hash})

        for doc in seeded_users:
            r = await db.users.replace_one(
                {"email": doc["email"], "role": doc["role"]},
                doc,
                upsert=True,
            )
            action = "inserted" if r.upserted_id else "updated"
            logger.info("  users: %s (%s)", doc["email"], action)

        for doc in SEED_CONNECTIONS:
            r = await db.connections.replace_one(
                {"connection_id": doc["connection_id"]}, doc, upsert=True
            )
            action = "inserted" if r.upserted_id else "updated"
            pair = f"{doc['initiated_by']} → {doc['status']}"
            logger.info(
                "  connections: %s… (%s, %s)",
                doc["connection_id"][:8],
                pair,
                action,
            )

        for doc in SEED_PRESCRIPTIONS:
            r = await db.prescriptions.replace_one(
                {"prescription_id": doc["prescription_id"]}, doc, upsert=True
            )
            action = "inserted" if r.upserted_id else "updated"
            logger.info(
                "  prescriptions: %s… (%s)",
                doc["prescription_id"][:8],
                action,
            )

        for doc in SEED_PATIENT_DOCUMENTS:
            r = await db.patient_documents.replace_one(
                {"document_id": doc["document_id"]}, doc, upsert=True
            )
            action = "inserted" if r.upserted_id else "updated"
            logger.info(
                "  patient_documents: %s… (%s)",
                doc["document_id"][:8],
                action,
            )

        logger.info("Seed complete.")
        return True
    finally:
        if own_client is not None:
            own_client.close()


if __name__ == "__main__":
    print("Seeding development data…\n")
    try:
        ran = asyncio.run(seed())
        if not ran:
            print("Skipped: seed users already present in the database.")
    except Exception as exc:
        print(f"\nSeed failed: {exc}", file=sys.stderr)
        sys.exit(1)
