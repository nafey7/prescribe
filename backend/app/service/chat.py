import logging
import re
from pathlib import Path
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.graph import invoke_medical_agent
from app.config import get_settings
from app.repository import chat as chat_repo
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatResponse,
    MessageSchema,
    PatientInfo,
)

logger = logging.getLogger(__name__)


async def process_message(
    message: str,
    chat_id: str | None,
    patient_id: str,
    db: AsyncIOMotorDatabase,
) -> ChatResponse:
    if chat_id is None:
        chat_id = str(uuid4())

    session = await chat_repo.get_session(db, chat_id)
    if session is None:
        await chat_repo.create_session(db, chat_id, patient_id)

    await chat_repo.save_message(db, chat_id, patient_id, "user", message)

    ai_response = await invoke_medical_agent(
        message=message,
        patient_id=patient_id,
        chat_id=chat_id,
    )

    message_id = await chat_repo.save_message(
        db, chat_id, patient_id, "assistant", ai_response
    )

    return ChatResponse(
        message=ai_response,
        chat_id=chat_id,
        message_id=message_id,
    )


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


def list_patients() -> list[PatientInfo]:
    settings = get_settings()
    data_dir = Path(settings.PATIENT_DATA_DIR)

    if not data_dir.exists():
        return []

    patients = []
    for f in sorted(data_dir.glob("patient_*.md")):
        patient_id = f.stem.replace("patient_", "")
        name = _id_to_display_name(patient_id)
        patients.append(PatientInfo(id=patient_id, name=name, file=f.name))
    return patients


def _id_to_display_name(patient_id: str) -> str:
    """Convert 'john_doe' → 'John Doe'."""
    return " ".join(word.capitalize() for word in patient_id.split("_"))
