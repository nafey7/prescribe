from fastapi import APIRouter

from app.api.chat import router as chat_router
from app.api.config import router as config_router
from app.api.documents import router as documents_router
from app.api.patients import router as patients_router
from app.api.suggestions import router as suggestions_router

api_router = APIRouter()
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(patients_router, prefix="/patients", tags=["patients"])
api_router.include_router(documents_router, prefix="/patients", tags=["documents"])
api_router.include_router(suggestions_router, prefix="/patients", tags=["suggestions"])
api_router.include_router(config_router, prefix="/config", tags=["config"])
