from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.fitness_plan import FitnessPlanPayload


class FitnessPlanShareCreate(BaseModel):
    chat_id: str = Field(..., min_length=1)
    message_id: str = Field(..., min_length=1)


class FitnessPlanShareResponse(BaseModel):
    share_id: str
    patient_id: str
    doctor_id: str
    fitness_plan: FitnessPlanPayload
    source_chat_id: str
    source_message_id: str
    chat_title: str | None = None
    doctor_display_name: str | None = None
    created_at: datetime
    revoked_at: datetime | None = None


class FitnessPlanShareListItem(BaseModel):
    share_id: str
    doctor_id: str
    doctor_display_name: str | None = None
    chat_title: str | None = None
    created_at: datetime
    goal_snippet: str | None = None


class FitnessPlanShareListResponse(BaseModel):
    shares: list[FitnessPlanShareListItem]
    total: int
    skip: int
    limit: int
