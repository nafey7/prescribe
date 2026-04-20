from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repository import chat as chat_repo
from app.schemas.chat import ChatHistoryResponse, ChatRequest, ChatResponse, ChatSessionSummary
from app.service import chat as chat_service
from app.service import connection as connection_service


async def process_doctor_message(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    request: ChatRequest,
) -> ChatResponse:
    await connection_service.verify_connection(db, doctor_id, patient_id)
    return await chat_service.process_message(
        message=request.message,
        chat_id=request.chat_id,
        patient_id=patient_id,
        db=db,
        doctor_id=doctor_id,
    )


async def list_doctor_patient_sessions(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
) -> list[ChatSessionSummary]:
    await connection_service.verify_connection(db, doctor_id, patient_id)
    rows = await chat_repo.list_sessions(
        db, doctor_id=doctor_id, patient_id=patient_id, limit=200
    )
    return [_session_to_summary(r) for r in rows]


async def list_doctor_all_sessions(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    *,
    patient_id: str | None = None,
) -> list[ChatSessionSummary]:
    if patient_id is not None:
        await connection_service.verify_connection(db, doctor_id, patient_id)
    rows = await chat_repo.list_sessions(
        db,
        doctor_id=doctor_id,
        patient_id=patient_id,
        limit=200,
    )
    return [_session_to_summary(r) for r in rows]


def _session_to_summary(doc: dict) -> ChatSessionSummary:
    return ChatSessionSummary(
        chat_id=doc["chat_id"],
        patient_id=doc.get("patient_id") or "",
        doctor_id=doc.get("doctor_id"),
        title=(doc.get("title") or "").strip(),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def get_doctor_chat_history(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    chat_id: str,
) -> ChatHistoryResponse:
    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    sd = session.get("doctor_id")
    if sd is None or sd != doctor_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this chat session",
        )
    history = await chat_service.get_chat_history(chat_id=chat_id, db=db)
    assert history is not None
    return history


async def delete_doctor_patient_chat(
    db: AsyncIOMotorDatabase,
    doctor_id: str,
    patient_id: str,
    chat_id: str,
) -> None:
    await connection_service.verify_connection(db, doctor_id, patient_id)
    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    sd = session.get("doctor_id")
    if sd is None or sd != doctor_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this chat session",
        )
    sp = session.get("patient_id")
    if sp is not None and sp != patient_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this chat session",
        )
    await chat_repo.delete_session_and_messages(db, chat_id)
