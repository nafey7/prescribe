import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.ai.graph import cleanup_graph
from app.api.router import api_router
from app.config import get_settings, validate_auth_settings
from app.database.connection import close_mongodb, connect_to_mongodb

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Medical AI Chat backend...")
    validate_auth_settings(get_settings())
    await connect_to_mongodb()
    yield
    cleanup_graph()
    await close_mongodb()
    logger.info("Backend shutdown complete.")


app = FastAPI(
    title="Medical AI Chat",
    description="AI-powered medical chat prototype",
    version="0.1.0",
    lifespan=lifespan,
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
        description=app.description,
    )
    components = openapi_schema.setdefault("components", {})
    schemes = components.setdefault("securitySchemes", {})
    schemes["HTTPBearer"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT access token",
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
