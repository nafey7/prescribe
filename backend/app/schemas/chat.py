from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    chat_id: str | None = None
    patient_id: str = "john_doe"


class ChatResponse(BaseModel):
    message: str
    chat_id: str
    message_id: str


class MessageSchema(BaseModel):
    role: str
    content: str
    timestamp: datetime


class ChatHistoryResponse(BaseModel):
    chat_id: str
    messages: list[MessageSchema]


class PatientInfo(BaseModel):
    id: str
    name: str
    file: str
