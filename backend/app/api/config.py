from fastapi import APIRouter, Depends, HTTPException

from app.ai.provider import get_active_provider, set_active_provider
from app.api.dependencies import auth_bypass_allowed, resolve_actor_user
from app.config import get_settings
from app.schemas.config import AIProvider, AIProviderRequest, AIProviderResponse
from app.schemas.enums import UserRole
from app.service.auth import CurrentUser

router = APIRouter()


def _ai_provider_response() -> AIProviderResponse:
    settings = get_settings()
    return AIProviderResponse(
        provider=get_active_provider(),
        available_providers=["openai", "gemini"],
        openai_key_present=bool(settings.OPENAI_API_KEY),
        gemini_key_present=bool(settings.GOOGLE_API_KEY),
    )


def _require_doctor_or_bypass(actor: CurrentUser | None) -> None:
    if actor is not None:
        if actor.role != UserRole.DOCTOR:
            raise HTTPException(status_code=403, detail="Doctor access required")
        return
    if auth_bypass_allowed():
        return
    raise HTTPException(status_code=401, detail="Authentication required")


@router.get("/features")
async def get_feature_flags():
    settings = get_settings()
    return {
        "ai_suggestions_enabled": settings.AI_SUGGESTIONS_ENABLED,
        "auth_relaxed": auth_bypass_allowed(settings),
        "allow_doctor_self_signup": settings.ALLOW_DOCTOR_SELF_SIGNUP,
    }


@router.get("/ai-provider", response_model=AIProviderResponse)
async def get_ai_provider(
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> AIProviderResponse:
    _require_doctor_or_bypass(actor)
    return _ai_provider_response()


@router.post("/ai-provider", response_model=AIProviderResponse)
async def set_ai_provider(
    body: AIProviderRequest,
    actor: CurrentUser | None = Depends(resolve_actor_user),
) -> AIProviderResponse:
    _require_doctor_or_bypass(actor)
    settings = get_settings()
    if body.provider == "openai" and not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Cannot switch to 'openai': OPENAI_API_KEY is not configured.",
        )
    if body.provider == "gemini" and not settings.GOOGLE_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Cannot switch to 'gemini': GOOGLE_API_KEY is not configured.",
        )
    set_active_provider(body.provider)
    return _ai_provider_response()
