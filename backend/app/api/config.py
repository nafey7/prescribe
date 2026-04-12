from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()


@router.get("/features")
async def get_feature_flags():
    settings = get_settings()
    return {
        "ai_suggestions_enabled": settings.AI_SUGGESTIONS_ENABLED,
    }
