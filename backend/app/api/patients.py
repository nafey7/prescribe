from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.dependencies import (
    assert_jwt_patient_can_access_patient_path,
    auth_bypass_allowed,
    patient_id_aliases_for_user,
    resolve_actor_user,
)
from app.database.connection import get_database
from app.schemas.connection import ConnectionListResponse
from app.schemas.chat import PatientInfo
from app.schemas.enums import UserRole
from app.schemas.medical_history import MedicalHistoryResponse
from app.schemas.patient import (
    PatientListResponse,
    PatientProfileCreate,
    PatientProfileResponse,
    PatientProfileUpdate,
)
from app.schemas.fitness_plan_share import FitnessPlanShareListResponse, FitnessPlanShareResponse
from app.schemas.meal_plan_share import MealPlanShareListResponse, MealPlanShareResponse
from app.service import connection as connection_service
from app.service import fitness_plan_share as fitness_plan_share_service
from app.service import medical_history as medical_history_service
from app.service import meal_plan_share as meal_plan_share_service
from app.service import patient as patient_service
from app.repository import connection as connection_repo
from app.repository import patient as patient_repo
from app.service.auth import CurrentUser
from app.service.chat import (
    list_patients as list_chat_patients,
    list_patients_for_doctor,
    list_patients_for_self,
)

router = APIRouter()


@router.post("", response_model=PatientProfileResponse, status_code=201)
async def register_patient(
    body: PatientProfileCreate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PatientProfileResponse:
    if actor is not None:
        raise HTTPException(
            status_code=403,
            detail="Cannot register a patient profile while authenticated",
        )
    if not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    db = get_database()
    return await patient_service.register_patient(db, body)


@router.get("", response_model=PatientListResponse)
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, description="Filter by name, email, or patient slug"),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PatientListResponse:
    db = get_database()
    if actor is not None:
        if actor.role == UserRole.PATIENT:
            return await patient_service.list_all_patients(
                db,
                skip=skip,
                limit=limit,
                search=search,
                restrict_to_user_id=actor.user_id,
            )
        if actor.role == UserRole.DOCTOR:
            return await patient_service.list_patients_for_connected_doctor(
                db,
                actor.user_id,
                skip=skip,
                limit=limit,
                search=search,
            )
        if actor.role == UserRole.ADMIN:
            return await patient_service.list_all_patients(
                db, skip=skip, limit=limit, search=search
            )
        raise HTTPException(status_code=403, detail="Not allowed")
    return await patient_service.list_all_patients(
        db, skip=skip, limit=limit, search=search
    )


@router.get("/for-chat", response_model=list[PatientInfo])
async def patients_for_chat(
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> list[PatientInfo]:
    db = get_database()
    if actor is not None:
        if actor.role == UserRole.PATIENT:
            return await list_patients_for_self(db, actor.user_id)
        if actor.role == UserRole.DOCTOR:
            return await list_patients_for_doctor(db, actor.user_id)
        if actor.role == UserRole.ADMIN:
            return await list_chat_patients(db)
        raise HTTPException(status_code=403, detail="Not allowed")
    return await list_chat_patients(db)


@router.get("/{patient_id}/connections", response_model=ConnectionListResponse)
async def list_patient_connections(
    patient_id: str,
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ConnectionListResponse:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await connection_service.get_patient_connections(
        db, patient_id, status=status, skip=skip, limit=limit
    )


@router.get("/{patient_id}/meal-plan-shares", response_model=MealPlanShareListResponse)
async def list_patient_meal_plan_shares(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> MealPlanShareListResponse:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        scope_ids = list(await patient_id_aliases_for_user(db, actor.user_id))
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    else:
        scope_ids = [patient_id]
    return await meal_plan_share_service.patient_list_shares(
        db, patient_ids=scope_ids, skip=skip, limit=limit
    )


@router.get("/{patient_id}/meal-plan-shares/{share_id}", response_model=MealPlanShareResponse)
async def get_patient_meal_plan_share(
    patient_id: str,
    share_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> MealPlanShareResponse:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        scope_ids = list(await patient_id_aliases_for_user(db, actor.user_id))
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    else:
        scope_ids = [patient_id]
    return await meal_plan_share_service.patient_get_share(
        db, patient_ids=scope_ids, share_id=share_id
    )


@router.get("/{patient_id}/meal-plan-shares/{share_id}/pdf")
async def download_patient_meal_plan_share_pdf(
    patient_id: str,
    share_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> Response:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        scope_ids = list(await patient_id_aliases_for_user(db, actor.user_id))
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    else:
        scope_ids = [patient_id]
    pdf_bytes = await meal_plan_share_service.patient_share_pdf_bytes(
        db, patient_ids=scope_ids, share_id=share_id
    )
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in share_id)
    safe = (safe or "plan")[:120]
    filename = f"meal-plan-{safe}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/{patient_id}/fitness-plan-shares", response_model=FitnessPlanShareListResponse)
async def list_patient_fitness_plan_shares(
    patient_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> FitnessPlanShareListResponse:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        scope_ids = list(await patient_id_aliases_for_user(db, actor.user_id))
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    else:
        scope_ids = [patient_id]
    return await fitness_plan_share_service.patient_list_shares(
        db, patient_ids=scope_ids, skip=skip, limit=limit
    )


@router.get("/{patient_id}/fitness-plan-shares/{share_id}", response_model=FitnessPlanShareResponse)
async def get_patient_fitness_plan_share(
    patient_id: str,
    share_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> FitnessPlanShareResponse:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        scope_ids = list(await patient_id_aliases_for_user(db, actor.user_id))
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    else:
        scope_ids = [patient_id]
    return await fitness_plan_share_service.patient_get_share(
        db, patient_ids=scope_ids, share_id=share_id
    )


@router.get("/{patient_id}/fitness-plan-shares/{share_id}/pdf")
async def download_patient_fitness_plan_share_pdf(
    patient_id: str,
    share_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> Response:
    db = get_database()
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        scope_ids = list(await patient_id_aliases_for_user(db, actor.user_id))
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    else:
        scope_ids = [patient_id]
    pdf_bytes = await fitness_plan_share_service.patient_share_pdf_bytes(
        db, patient_ids=scope_ids, share_id=share_id
    )
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in share_id)
    safe = (safe or "plan")[:120]
    filename = f"fitness-plan-{safe}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/{patient_id}/medical-history", response_model=MedicalHistoryResponse)
async def get_patient_medical_history(
    patient_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> MedicalHistoryResponse:
    db = get_database()
    if actor is not None:
        if actor.role == UserRole.PATIENT:
            await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        elif actor.role == UserRole.DOCTOR:
            doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
            if doc is None:
                raise HTTPException(status_code=404, detail="Patient not found")
            if not await connection_repo.is_connected(db, actor.user_id, doc["user_id"]):
                raise HTTPException(
                    status_code=403,
                    detail="Not allowed to access this patient",
                )
        elif actor.role == UserRole.ADMIN:
            pass
        else:
            raise HTTPException(status_code=403, detail="Not allowed")
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await medical_history_service.get_medical_history(db, patient_id)


@router.get("/{patient_id}", response_model=PatientProfileResponse)
async def get_patient(
    patient_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PatientProfileResponse:
    db = get_database()
    if actor is not None:
        if actor.role == UserRole.PATIENT:
            await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
        elif actor.role == UserRole.DOCTOR:
            doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
            if doc is None:
                raise HTTPException(status_code=404, detail="Patient not found")
            if not await connection_repo.is_connected(db, actor.user_id, doc["user_id"]):
                raise HTTPException(
                    status_code=403,
                    detail="Not allowed to access this patient",
                )
        elif actor.role == UserRole.ADMIN:
            pass
        else:
            raise HTTPException(status_code=403, detail="Not allowed")
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await patient_service.get_patient_profile(db, patient_id)


@router.put("/{patient_id}", response_model=PatientProfileResponse)
async def update_patient(
    patient_id: str,
    body: PatientProfileUpdate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> PatientProfileResponse:
    db = get_database()
    doc = await patient_repo.find_patient_by_id_or_slug(db, patient_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    if actor is not None:
        await assert_jwt_patient_can_access_patient_path(db, actor, patient_id)
    elif not auth_bypass_allowed():
        raise HTTPException(status_code=401, detail="Authentication required")
    return await patient_service.update_patient_profile(db, doc["user_id"], body)
