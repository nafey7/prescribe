from fastapi import APIRouter

from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.patients import router as patients_router

api_router = APIRouter()
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(patients_router, prefix="/patients", tags=["patients"])
api_router.include_router(documents_router, prefix="/patients", tags=["documents"])
