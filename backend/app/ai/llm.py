from langchain_core.language_models import BaseChatModel

from app.ai.provider import get_active_provider
from app.config import get_settings


def get_llm() -> BaseChatModel:
    settings = get_settings()

    if get_active_provider() == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=settings.CHAT_MODEL_OPENAI,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
            max_tokens=2048,
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.CHAT_MODEL_GOOGLE,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.3,
        max_output_tokens=2048,
    )


def get_llm_deterministic() -> BaseChatModel:
    """Return the active LLM at temperature=0.0 for deterministic structured-output tasks."""
    settings = get_settings()

    if get_active_provider() == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=settings.CHAT_MODEL_OPENAI,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.0,
            max_tokens=2048,
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.CHAT_MODEL_GOOGLE,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.0,
        max_output_tokens=2048,
    )
