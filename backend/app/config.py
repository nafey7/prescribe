from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "medical_chat"

    LLM_PROVIDER: Literal["openai", "gemini"] = "openai"
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # Main chat model for each provider (override via env).
    CHAT_MODEL_OPENAI: str = "gpt-4o-mini"
    CHAT_MODEL_GOOGLE: str = "gemini-2.5-flash"
    CHAT_CONTEXT_MAX_TOKENS: int = 24000
    AI_RUN_TIMEOUT_SECONDS: float = 120.0

    # Short thread titles from the first user message
    CHAT_TITLE_MODEL_OPENAI: str = "gpt-4o-mini"
    # Use the same Google model as the main chat flow (newer API keys often reject gemini-1.5-* on v1beta).
    CHAT_TITLE_MODEL_GOOGLE: str = "gemini-2.5-flash"

    AI_SUGGESTIONS_ENABLED: bool = True

    # Auth (Phase D)
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "prescribe-v2"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_LEEWAY_SECONDS: int = 30
    AUTH_REQUIRED: bool = True
    ENVIRONMENT: str = "local"
    # IANA timezone for "today" in AI system prompts (e.g. America/New_York). Default UTC.
    APP_TIMEZONE: str = "UTC"
    ALLOW_DOCTOR_SELF_SIGNUP: bool = False
    BCRYPT_ROUNDS: int = 12
    CORS_ALLOWED_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def validate_auth_settings(settings: Settings) -> None:
    """Raise if JWT is required but secret is missing or a known placeholder."""
    if settings.AUTH_REQUIRED:
        secret = (settings.JWT_SECRET or "").strip()
        if not secret or secret == "change-me":
            raise RuntimeError(
                "JWT_SECRET must be set to a non-default value when AUTH_REQUIRED=true"
            )
