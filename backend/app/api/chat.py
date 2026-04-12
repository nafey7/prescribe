import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_patient_id
from app.database.connection import get_database
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    PatientInfo,
)
from app.service.chat import (
    get_chat_history,
    list_patients,
    process_message,
    process_message_stream,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/message", response_model=ChatResponse)
async def chat_message(
    request: ChatRequest,
    patient_id: str = Depends(get_current_patient_id),
) -> ChatResponse:
    db = get_database()
    try:
        response = await process_message(
            message=request.message,
            chat_id=request.chat_id,
            patient_id=patient_id,
            db=db,
        )
        return response
    except Exception as e:
        logger.exception("Error processing chat message")
        raise HTTPException(
            status_code=503,
            detail=f"AI service error: {str(e)}",
        )


@router.post("/message/stream")
async def chat_message_stream(
    request: ChatRequest,
    patient_id: str = Depends(get_current_patient_id),
):
    db = get_database()
    return StreamingResponse(
        process_message_stream(
            message=request.message,
            chat_id=request.chat_id,
            patient_id=patient_id,
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history/{chat_id}", response_model=ChatHistoryResponse)
async def chat_history(chat_id: str) -> ChatHistoryResponse:
    db = get_database()
    history = await get_chat_history(chat_id=chat_id, db=db)
    if history is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return history


@router.get("/patients", response_model=list[PatientInfo])
async def patients() -> list[PatientInfo]:
    db = get_database()
    return await list_patients(db)
