"""Connection-gated prescription CRUD for doctors."""

from __future__ import annotations

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import patient as patient_repo
from app.repository import prescriptions as prescriptions_repo
from app.schemas.enums import PrescriptionStatus
from app.schemas.prescription import Medication, PrescriptionCreate


async def _verify(db: AsyncIOMotorDatabase, doctor_id: str, patient_id: str) -> None:
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    from app.service import connection as connection_service
    await connection_service.verify_connection(db, doctor_id, doc["user_id"])


async def list_prescriptions(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    *,
    status: PrescriptionStatus | None = None,
) -> list[dict]:
    await _verify(db, doctor_id, patient_id)
    return await prescriptions_repo.list_prescriptions_for_patient(
        db, patient_id, status=status
    )


async def create_prescription(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    *,
    created_by_user_id: str,
    diagnosis_summary: str,
    notes: str,
    medications: list[Medication],
) -> dict:
    await _verify(db, doctor_id, patient_id)
    payload = PrescriptionCreate(
        patient_id=patient_id,
        doctor_id=doctor_id,
        created_by_user_id=created_by_user_id,
        diagnosis_summary=diagnosis_summary,
        notes=notes,
        medications=medications,
    )
    return await prescriptions_repo.create_prescription(db, payload)


async def get_prescription(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    prescription_id: str,
) -> dict:
    await _verify(db, doctor_id, patient_id)
    doc = await prescriptions_repo.get_prescription_by_id(db, prescription_id)
    if doc is None or doc.get("patient_id") != patient_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return doc


async def update_status(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    prescription_id: str,
    new_status: PrescriptionStatus,
) -> dict:
    await _verify(db, doctor_id, patient_id)
    doc = await prescriptions_repo.get_prescription_by_id(db, prescription_id)
    if doc is None or doc.get("patient_id") != patient_id:
        raise HTTPException(status_code=404, detail="Prescription not found")
    result = await prescriptions_repo.update_prescription_status(
        db, prescription_id, new_status
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return result


async def cancel_prescription(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    prescription_id: str,
) -> dict:
    return await update_status(
        db, doctor_id, patient_id, prescription_id, PrescriptionStatus.CANCELLED
    )
