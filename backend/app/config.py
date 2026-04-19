from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "medical_chat"

    LLM_PROVIDER: str = "google"
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    PATIENT_DATA_DIR: str = "data/patients"

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
