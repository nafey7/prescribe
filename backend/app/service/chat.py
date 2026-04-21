import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from uuid import uuid4

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.chat_title import generate_chat_title
from app.ai.graph import invoke_medical_agent, stream_medical_agent
from app.ai.prompts import build_system_prompt
from app.repository import chat as chat_repo
from app.repository import connection as connection_repo
from app.repository import doctor as doctor_repo
from app.repository import patient as patient_repo
from app.repository import patients as patients_repo
from app.repository.patient import find_patient_by_id_or_slug
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatResponse,
    MessageSchema,
    PatientInfo,
)
from app.schemas.patient import document_to_profile_response

logger = logging.getLogger(__name__)


def _validate_existing_session(
    session: dict, patient_id: str, doctor_id: str | None
) -> None:
    if session.get("patient_id") != patient_id:
        raise HTTPException(
            status_code=400,
            detail="Chat session does not match this patient",
        )
    if doctor_id is not None:
        sd = session.get("doctor_id")
        if sd is None:
            raise HTTPException(
                status_code=403,
                detail="This chat cannot be continued in the doctor portal",
            )
        if sd != doctor_id:
            raise HTTPException(
                status_code=403,
                detail="Chat session does not belong to this doctor",
            )


async def _resolve_system_prompt(
    db: AsyncIOMotorDatabase, patient_id: str, doctor_id: str | None
) -> str | None:
    if not doctor_id:
        return None
    ddoc = await doctor_repo.get_doctor(db, doctor_id)
    pdoc = await find_patient_by_id_or_slug(db, patient_id)
    if pdoc:
        pr = document_to_profile_response(pdoc)
        patient_display_name = (
            f"{pr.first_name} {pr.last_name}".strip()
            or pr.patient_slug
            or patient_id
        )
    else:
        patient_display_name = patient_id

    if not ddoc:
        return build_system_prompt(
            patient_id,
            patient_display_name=patient_display_name,
            doctor_name="Doctor",
            specialization=None,
            institution=None,
        )

    prof = ddoc.get("doctor_profile") or {}
    title = (prof.get("title") or "Dr.").strip()
    fn = (prof.get("first_name") or "").strip()
    ln = (prof.get("last_name") or "").strip()
    doctor_name = " ".join(p for p in (title, fn, ln) if p).strip() or (
        ddoc.get("email") or "Doctor"
    )

    return build_system_prompt(
        patient_id,
        patient_display_name=patient_display_name,
        doctor_name=doctor_name,
        specialization=prof.get("specialization"),
        institution=prof.get("institution"),
    )


async def process_message(
    message: str,
    chat_id: str | None,
    patient_id: str,
    db: AsyncIOMotorDatabase,
    doctor_id: str | None = None,
) -> ChatResponse:
    if chat_id is None:
        chat_id = str(uuid4())

    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        await chat_repo.create_session(db, chat_id, patient_id, doctor_id=doctor_id)
    else:
        _validate_existing_session(session, patient_id, doctor_id)

    system_prompt = await _resolve_system_prompt(db, patient_id, doctor_id)

    is_first_message = await chat_repo.count_messages(db, chat_id) == 0

    await chat_repo.save_message(
        db, chat_id, patient_id, "user", message, doctor_id=doctor_id
    )

    try:
        ai_response = await invoke_medical_agent(
            message=message,
            patient_id=patient_id,
            chat_id=chat_id,
            system_prompt=system_prompt,
        )
    except Exception:
        raise

    message_id = await chat_repo.save_message(
        db, chat_id, patient_id, "assistant", ai_response, doctor_id=doctor_id
    )

    chat_title: str | None = None
    if is_first_message:
        try:
            chat_title = await asyncio.wait_for(
                generate_chat_title(message), timeout=30.0
            )
            await chat_repo.set_session_title(db, chat_id, chat_title)
        except Exception:
            logger.warning("Failed to set chat title", exc_info=True)

    return ChatResponse(
        message=ai_response,
        chat_id=chat_id,
        message_id=message_id,
        chat_title=chat_title,
    )


def _format_sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def process_message_stream(
    message: str,
    chat_id: str | None,
    patient_id: str,
    db: AsyncIOMotorDatabase,
    doctor_id: str | None = None,
) -> AsyncGenerator[str, None]:
    if chat_id is None:
        chat_id = str(uuid4())

    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        await chat_repo.create_session(db, chat_id, patient_id, doctor_id=doctor_id)
    else:
        _validate_existing_session(session, patient_id, doctor_id)

    system_prompt = await _resolve_system_prompt(db, patient_id, doctor_id)

    is_first_message = await chat_repo.count_messages(db, chat_id) == 0

    await chat_repo.save_message(
        db, chat_id, patient_id, "user", message, doctor_id=doctor_id
    )

    yield _format_sse("thinking", {"status": "Thinking...", "phase": "thinking"})

    full_response = ""
    try:
        async for event in stream_medical_agent(
            message=message,
            patient_id=patient_id,
            chat_id=chat_id,
            system_prompt=system_prompt,
        ):
            if event["event"] == "token":
                full_response += event["data"]["content"]
            yield _format_sse(event["event"], event["data"])

        if not full_response:
            logger.warning(
                "chat_stream_empty_assistant chat_id=%s doctor_id=%s — using fallback message",
                chat_id,
                doctor_id or "none",
            )
            full_response = "I wasn't able to generate a response. Please try again."
            yield _format_sse("token", {"content": full_response})

        message_id = await chat_repo.save_message(
            db, chat_id, patient_id, "assistant", full_response, doctor_id=doctor_id
        )

        # Run title after the main model finishes — avoids two concurrent Gemini calls (429).
        if is_first_message:
            try:
                chat_title = await asyncio.wait_for(
                    generate_chat_title(message), timeout=30.0
                )
                await chat_repo.set_session_title(db, chat_id, chat_title)
                yield _format_sse("title", {"title": chat_title})
            except Exception:
                logger.warning("Failed to set chat title", exc_info=True)

        yield _format_sse("done", {"chat_id": chat_id, "message_id": message_id})

    except Exception as e:
        logger.exception("Error during streaming")
        yield _format_sse("error", {"detail": str(e)})


async def get_chat_history(
    chat_id: str, db: AsyncIOMotorDatabase
) -> ChatHistoryResponse | None:
    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        return None

    raw_messages = await chat_repo.get_messages(db, chat_id)
    messages = [
        MessageSchema(
            role=m["role"],
            content=m["content"],
            timestamp=m["timestamp"],
        )
        for m in raw_messages
    ]
    return ChatHistoryResponse(chat_id=chat_id, messages=messages)


async def list_patients_for_self(
    db: AsyncIOMotorDatabase, user_id: str
) -> list[PatientInfo]:
    """Single entry for the authenticated patient (legacy or Phase A profile)."""
    legacy = await patient_repo.get_patient(db, user_id)
    if legacy:
        profile = document_to_profile_response(legacy)
        slug = profile.patient_slug or profile.user_id
        name = f"{profile.first_name} {profile.last_name}".strip() or slug
        return [PatientInfo(id=slug, name=name, user_id=profile.user_id)]
    phase = await patients_repo.get_profile_by_user_id(db, user_id)
    if phase:
        pid = phase["patient_id"]
        name = (phase.get("full_name") or "").strip() or pid
        return [PatientInfo(id=pid, name=name, user_id=user_id)]
    return []


async def list_patients(db: AsyncIOMotorDatabase) -> list[PatientInfo]:
    items, _ = await patient_repo.list_patients(db, skip=0, limit=500)
    out: list[PatientInfo] = []
    for doc in items:
        profile = document_to_profile_response(doc)
        slug = profile.patient_slug or profile.user_id
        name = f"{profile.first_name} {profile.last_name}".strip() or slug
        out.append(PatientInfo(id=slug, name=name, user_id=profile.user_id))
    return out


async def list_patients_for_doctor(
    db: AsyncIOMotorDatabase, doctor_id: str
) -> list[PatientInfo]:
    conns = await connection_repo.list_connected_patients(db, doctor_id)
    out: list[PatientInfo] = []
    for c in conns:
        pdoc = await patient_repo.get_patient(db, c["patient_id"])
        if not pdoc:
            continue
        profile = document_to_profile_response(pdoc)
        slug = profile.patient_slug or profile.user_id
        name = f"{profile.first_name} {profile.last_name}".strip() or slug
        out.append(PatientInfo(id=slug, name=name, user_id=profile.user_id))
    return out
