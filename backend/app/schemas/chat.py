from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import ChatType, SenderType, UserRole
from app.utils import chat_id as _chat_id
from app.utils import message_id as _message_id
from app.utils import utcnow


# ---------------------------------------------------------------------------
# API DTOs (unchanged for backward compat)
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    chat_id: str | None = None


class ChatResponse(BaseModel):
    message: str
    chat_id: str
    message_id: str
    chat_title: str | None = None


class MessageSchema(BaseModel):
    role: str
    content: str
    timestamp: datetime


class ChatHistoryResponse(BaseModel):
    chat_id: str
    messages: list[MessageSchema]


class ChatSessionSummary(BaseModel):
    chat_id: str
    patient_id: str
    doctor_id: str | None = None
    title: str = ""
    created_at: datetime
    updated_at: datetime


class PatientInfo(BaseModel):
    id: str
    name: str
    user_id: str | None = None


# ---------------------------------------------------------------------------
# Evolved document models (Phase A)
# ---------------------------------------------------------------------------


class ChatSessionDocument(BaseModel):
    """MongoDB document shape for the evolved `chat_sessions` collection."""

    chat_id: str = Field(default_factory=_chat_id)
    chat_type: ChatType = ChatType.DOCTOR_PATIENT_CONTEXT
    owner_user_id: str | None = None
    actor_role: UserRole | None = None
    doctor_id: str | None = None
    patient_id: str | None = None
    title: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    last_message_at: datetime | None = None


class ChatMessageDocument(BaseModel):
    """MongoDB document shape for the evolved `chat_messages` collection."""

    message_id: str = Field(default_factory=_message_id)
    chat_id: str
    sender_type: SenderType = SenderType.USER
    sender_user_id: str | None = None
    actor_role: UserRole | None = None
    patient_id: str | None = None
    doctor_id: str | None = None
    content: str = ""
    timestamp: datetime = Field(default_factory=utcnow)
