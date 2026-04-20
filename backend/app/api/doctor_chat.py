import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from app.api.dependencies import ensure_doctor_route, resolve_actor_user
from app.database.connection import get_database
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionSummary,
)
from app.service import chat as chat_service
from app.service import connection as connection_service
from app.service import doctor_chat as doctor_chat_service
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
