from fastapi import APIRouter

from app.api.dependencies import auth_bypass_allowed
from app.config import get_settings

router = APIRouter()


@router.get("/features")
async def get_feature_flags():
    settings = get_settings()
    return {
        "ai_suggestions_enabled": settings.AI_SUGGESTIONS_ENABLED,
        "auth_relaxed": auth_bypass_allowed(settings),
        "allow_doctor_self_signup": settings.ALLOW_DOCTOR_SELF_SIGNUP,
    }
