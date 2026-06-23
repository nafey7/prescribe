import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.dependencies import ensure_doctor_route, resolve_actor_user
from app.database.connection import get_database
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionSummary,
)
from app.schemas.fitness_plan_share import FitnessPlanShareCreate, FitnessPlanShareResponse
from app.schemas.meal_plan_share import MealPlanShareCreate, MealPlanShareResponse
from app.service import chat as chat_service
from app.service import connection as connection_service
from app.service import doctor_chat as doctor_chat_service
from app.service import fitness_plan_share as fitness_plan_share_service
from app.service import meal_plan_share as meal_plan_share_service
from app.service.auth import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/{doctor_id}/patients/{patient_id}/chat/message",
    response_model=ChatResponse,
)
async def doctor_send_message(
    doctor_id: str,
    patient_id: str,
    request: ChatRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ChatResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    try:
        return await doctor_chat_service.process_doctor_message(
            db, doctor_id, patient_id, request
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error processing doctor chat message")
        raise HTTPException(
            status_code=503,
            detail=f"AI service error: {str(e)}",
        ) from e


@router.post("/{doctor_id}/patients/{patient_id}/chat/message/stream")
async def doctor_send_message_stream(
    doctor_id: str,
    patient_id: str,
    request: ChatRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
):
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    await connection_service.verify_connection(db, doctor_id, patient_id)
    await chat_service.validate_message_session(
        db, request.chat_id, patient_id, doctor_id
    )
    return StreamingResponse(
        chat_service.process_message_stream(
            message=request.message,
            chat_id=request.chat_id,
            patient_id=patient_id,
            db=db,
            doctor_id=doctor_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/{doctor_id}/patients/{patient_id}/chat/sessions",
    response_model=list[ChatSessionSummary],
)
async def doctor_list_patient_sessions(
    doctor_id: str,
    patient_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> list[ChatSessionSummary]:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_chat_service.list_doctor_patient_sessions(
        db, doctor_id, patient_id
    )


@router.get(
    "/{doctor_id}/chat/sessions",
    response_model=list[ChatSessionSummary],
)
async def doctor_list_all_sessions(
    doctor_id: str,
    patient_id: str | None = Query(
        None, description="Optional filter to one connected patient"
    ),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> list[ChatSessionSummary]:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_chat_service.list_doctor_all_sessions(
        db, doctor_id, patient_id=patient_id
    )


@router.get(
    "/{doctor_id}/chat/history/{chat_id}",
    response_model=ChatHistoryResponse,
)
async def doctor_chat_history(
    doctor_id: str,
    chat_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> ChatHistoryResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    return await doctor_chat_service.get_doctor_chat_history(
        db, doctor_id, chat_id
    )


@router.get("/{doctor_id}/patients/{patient_id}/chat/meal-plan/pdf")
async def doctor_download_meal_plan_pdf(
    doctor_id: str,
    patient_id: str,
    chat_id: str = Query(..., min_length=1),
    message_id: str = Query(..., min_length=1),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> Response:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    pdf_bytes = await meal_plan_share_service.doctor_meal_plan_pdf_bytes(
        db, doctor_id, patient_id, chat_id, message_id
    )
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in message_id)
    safe = (safe or "plan")[:120]
    filename = f"meal-plan-{safe}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post(
    "/{doctor_id}/patients/{patient_id}/meal-plan-shares",
    response_model=MealPlanShareResponse,
    responses={200: {"model": MealPlanShareResponse}, 201: {"model": MealPlanShareResponse}},
)
async def doctor_create_meal_plan_share(
    doctor_id: str,
    patient_id: str,
    body: MealPlanShareCreate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> JSONResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    result, created = await meal_plan_share_service.doctor_create_share(
        db, doctor_id, patient_id, body.chat_id, body.message_id
    )
    return JSONResponse(
        status_code=201 if created else 200,
        content=jsonable_encoder(result),
    )


@router.get("/{doctor_id}/patients/{patient_id}/chat/fitness-plan/pdf")
async def doctor_download_fitness_plan_pdf(
    doctor_id: str,
    patient_id: str,
    chat_id: str = Query(..., min_length=1),
    message_id: str = Query(..., min_length=1),
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> Response:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    pdf_bytes = await fitness_plan_share_service.doctor_fitness_plan_pdf_bytes(
        db, doctor_id, patient_id, chat_id, message_id
    )
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in message_id)
    safe = (safe or "plan")[:120]
    filename = f"fitness-plan-{safe}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post(
    "/{doctor_id}/patients/{patient_id}/fitness-plan-shares",
    response_model=FitnessPlanShareResponse,
    responses={200: {"model": FitnessPlanShareResponse}, 201: {"model": FitnessPlanShareResponse}},
)
async def doctor_create_fitness_plan_share(
    doctor_id: str,
    patient_id: str,
    body: FitnessPlanShareCreate,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> JSONResponse:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    result, created = await fitness_plan_share_service.doctor_create_share(
        db, doctor_id, patient_id, body.chat_id, body.message_id
    )
    return JSONResponse(
        status_code=201 if created else 200,
        content=jsonable_encoder(result),
    )


@router.delete("/{doctor_id}/patients/{patient_id}/chat/{chat_id}")
async def doctor_delete_patient_chat(
    doctor_id: str,
    patient_id: str,
    chat_id: str,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> Response:
    ensure_doctor_route(actor, doctor_id)
    db = get_database()
    await doctor_chat_service.delete_doctor_patient_chat(
        db, doctor_id, patient_id, chat_id
    )
    return Response(status_code=204)
