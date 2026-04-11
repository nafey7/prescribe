from langchain_core.language_models import BaseChatModel

from app.config import get_settings


def get_llm() -> BaseChatModel:
    settings = get_settings()

    if settings.LLM_PROVIDER == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
            max_tokens=2048,
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.3,
        max_output_tokens=2048,
    )
