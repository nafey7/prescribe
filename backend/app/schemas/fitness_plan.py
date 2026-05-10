from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

DEFAULT_FITNESS_DISCLAIMER = (
    "This fitness plan is generated for educational purposes only and is not a substitute "
    "for professional medical or fitness advice. Please consult your healthcare provider "
    "before beginning any new exercise program, especially if you have existing medical conditions."
)

MAX_FITNESS_PLAN_DAYS = 28


class ExerciseItem(BaseModel):
    name: str = Field(..., min_length=1, description="Exercise name")
    sets: int | None = None
    reps: str | None = None
    duration_minutes: int | None = None
    rest_seconds: int | None = None
    notes: str = ""
    modifications: list[str] = Field(default_factory=list)

    @field_validator("reps", mode="before")
    @classmethod
    def coerce_reps_to_str(cls, v: object) -> str | None:
        if v is None:
            return None
        return str(v)


class WorkoutSession(BaseModel):
    session_type: Literal["cardio", "strength", "flexibility", "balance", "rest"]
    name: str
    duration_minutes: int
    intensity: Literal["low", "moderate", "high"]
    exercises: list[ExerciseItem] = Field(default_factory=list)
    warmup_notes: str = ""
    cooldown_notes: str = ""


class DayWorkout(BaseModel):
    day_index: int = Field(..., ge=1, description="Day number (1-indexed)")
    label: str | None = None
    sessions: list[WorkoutSession] = Field(default_factory=list)
    is_rest_day: bool = False


class FitnessPlanPayload(BaseModel):
    num_days: int = Field(
        default=7,
        ge=1,
        le=MAX_FITNESS_PLAN_DAYS,
        description="Number of days in the fitness plan (1–28)",
    )
    days: list[DayWorkout] = Field(..., description="Day-by-day workout entries")
    goal: str = Field(..., description="Overall fitness goal")
    fitness_level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    medical_notes: str = Field(default="", description="AI-authored contraindication notes")
    summary: str = Field(default="", description="Short overall summary")
    disclaimer: str = Field(default=DEFAULT_FITNESS_DISCLAIMER)

    @field_validator("num_days", mode="before")
    @classmethod
    def clamp_num_days(cls, v: int) -> int:
        """Silently clamp to valid range rather than raising an error."""
        try:
            v = int(v)
        except (TypeError, ValueError):
            return 7
        return max(1, min(v, MAX_FITNESS_PLAN_DAYS))
