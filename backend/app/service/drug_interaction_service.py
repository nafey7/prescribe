"""Drug interaction service: fetch patient context and invoke AI graph."""

from __future__ import annotations

import logging

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.drug_interaction_graph import check_drug_interactions
from app.repository import patient as patient_repo
from app.schemas.drug_interaction import (
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponse,
)
from app.service import connection as connection_service
from app.service.prescription_copilot import _format_patient_context

logger = logging.getLogger(__name__)


async def check_interactions(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    request: DrugInteractionCheckRequest,
) -> DrugInteractionCheckResponse:
    patient_doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if patient_doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    await connection_service.verify_connection(db, doctor_id, patient_doc["user_id"])

    patient_context = _format_patient_context(patient_doc)
    proposed = [m.model_dump() for m in request.medications]

    logger.info(
        "drug_interaction_check_request doctor=%s patient=%s proposed_count=%d",
        doctor_id,
        patient_id,
        len(proposed),
    )

    return await check_drug_interactions(proposed, patient_context)
