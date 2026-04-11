from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "medical_chat"

    LLM_PROVIDER: str = "google"
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    PATIENT_DATA_DIR: str = "data/patients"


@lru_cache
def get_settings() -> Settings:
    return Settings()
