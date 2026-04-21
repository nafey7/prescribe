from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

MEAL_PLAN_DISCLAIMER = (
    "This meal plan is generated for educational purposes only and is not a substitute "
    "for professional dietary or medical counseling. Please consult a registered dietitian "
    "or your healthcare provider before making significant dietary changes."
)

MAX_MEAL_PLAN_DAYS = 14


class MealItem(BaseModel):
    name: str = Field(..., min_length=1, description="Meal name (e.g. 'Grilled Salmon')")
    description: str = Field(default="", description="Brief description of the meal")
    items: list[str] = Field(default_factory=list, description="List of food items or ingredients")


class DayPlan(BaseModel):
    day_index: int = Field(..., ge=1, description="Day number (1-indexed)")
    label: str | None = Field(default=None, description="Optional label such as 'Day 1 – Monday'")
    meals: list[MealItem] = Field(default_factory=list, description="Meals for this day")


class MealPlanPayload(BaseModel):
    num_days: int = Field(
        default=7,
        ge=1,
        le=MAX_MEAL_PLAN_DAYS,
        description="Number of days in the meal plan (1–14)",
    )
    days: list[DayPlan] = Field(
        ...,
        description="Day-by-day meal plan entries",
    )
    summary: str = Field(default="", description="Short overall summary of the meal plan")
    disclaimer: str = Field(
        default=MEAL_PLAN_DISCLAIMER,
        description="Educational disclaimer text",
    )

    @field_validator("num_days", mode="before")
    @classmethod
    def clamp_num_days(cls, v: int) -> int:
        """Silently clamp to valid range rather than raising an error."""
        try:
            v = int(v)
        except (TypeError, ValueError):
            return 7
        return max(1, min(v, MAX_MEAL_PLAN_DAYS))
