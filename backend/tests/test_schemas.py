"""Unit tests for Pydantic schemas (Phase A)."""

import pytest
from pydantic import ValidationError

from app.schemas.enums import Gender, LinkRequestedBy, UserRole, UserStatus
from app.schemas.patient import PhaseAPatientProfileCreate, PatientProfileDocument
from app.schemas.prescription import Medication, PrescriptionCreate
from app.schemas.user import UserCreate, UserDocument


def test_user_document_model_dump_round_trip():
    doc = UserDocument(
        role=UserRole.PATIENT,
        email="a@example.com",
        phone="+10000000000",
    )
    data = doc.model_dump()
    assert "user_id" in data
    assert data["role"] == UserRole.PATIENT
    assert data["email"] == "a@example.com"
    assert data["password_hash"] is None


def test_user_create_minimal():
    u = UserCreate(role=UserRole.DOCTOR, email="doc@example.com")
    assert u.phone is None


def test_patient_profile_create_accepts_iso_date_string():
    p = PhaseAPatientProfileCreate(
        user_id="usr_x",
        full_name="Test",
        date_of_birth="1990-05-15",
    )
    assert p.date_of_birth is not None
    assert p.date_of_birth.isoformat() == "1990-05-15"


def test_patient_profile_create_rejects_invalid_date_string():
    with pytest.raises(ValidationError):
        PhaseAPatientProfileCreate(
            user_id="usr_x",
            full_name="Test",
            date_of_birth="not-a-date",
        )


def test_patient_profile_document_coerces_datetime_from_mongo():
    from datetime import date, datetime, timezone

    d = PatientProfileDocument(
        user_id="usr_x",
        full_name="Test",
        date_of_birth=datetime(1991, 6, 1, 12, 0, tzinfo=timezone.utc),
    )
    assert d.date_of_birth == date(1991, 6, 1)


def test_prescription_create_defaults():
    rx = PrescriptionCreate(
        patient_id="pat_a",
        doctor_id="dr_b",
        created_by_user_id="usr_c",
        medications=[Medication(name="Aspirin")],
    )
    dumped = rx.model_dump()
    assert dumped["diagnosis_summary"] == ""
    assert len(dumped["medications"]) == 1


def test_link_requested_by_enum_values():
    assert LinkRequestedBy.PATIENT == "patient"
