from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.meal_plan import MealPlanPayload


class MealPlanShareCreate(BaseModel):
    """Doctor request body when creating a share (Phase 3+)."""

    chat_id: str = Field(..., min_length=1)
    message_id: str = Field(..., min_length=1)


class MealPlanShareResponse(BaseModel):
    """Persisted share returned by APIs (list + detail)."""

    share_id: str
    patient_id: str
    doctor_id: str
    meal_plan: MealPlanPayload
    source_chat_id: str
    source_message_id: str
    chat_title: str | None = None
    doctor_display_name: str | None = None
    created_at: datetime
    revoked_at: datetime | None = None


class MealPlanShareListItem(BaseModel):
    """One row in the patient portal list (no full meal_plan payload)."""

    share_id: str
    doctor_id: str
    doctor_display_name: str | None = None
    chat_title: str | None = None
    created_at: datetime
    summary_line: str | None = None


class MealPlanShareListResponse(BaseModel):
    items: list[MealPlanShareListItem]
    total: int
    skip: int
    limit: int
