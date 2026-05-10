import asyncio
import logging
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.provider import get_active_provider
from app.config import get_settings

logger = logging.getLogger(__name__)

_MAX_TITLE_LEN = 80


def _sanitize_title(raw: str) -> str:
    t = raw.strip().strip('"').strip("'")
    t = re.sub(r"\s+", " ", t)
    if len(t) > _MAX_TITLE_LEN:
        t = t[: _MAX_TITLE_LEN - 1] + "…"
    return t


def _fallback_title(first_message: str) -> str:
    t = " ".join(first_message.strip().split())
    if not t:
        return "New chat"
    if len(t) <= 56:
        return t
    return t[:55] + "…"


def _text_from_response_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(str(block["text"]))
            elif hasattr(block, "text"):
                parts.append(str(getattr(block, "text", "")))
            else:
                parts.append(str(block))
        return "".join(parts)
    return str(content)


def get_title_llm():
    settings = get_settings()
    if get_active_provider() == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=settings.CHAT_TITLE_MODEL_OPENAI,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
            max_tokens=48,
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.CHAT_TITLE_MODEL_GOOGLE,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0,
        max_output_tokens=64,
    )


async def generate_chat_title(first_user_message: str) -> str:
    text = first_user_message.strip()
    if not text:
        return "New chat"
    bounded = text[:1500]
    llm = get_title_llm()
    messages = [
        SystemMessage(
            content=(
                "You write concise chat thread titles. "
                "Reply with a title only: at most 8 words, no quotation marks, "
                "no trailing punctuation, describing what the user is asking about."
            )
        ),
        HumanMessage(content=bounded),
    ]
    try:
        resp = await asyncio.to_thread(llm.invoke, messages)
        content = _text_from_response_content(getattr(resp, "content", ""))
        title = _sanitize_title(content)
        if len(title) < 2:
            return _fallback_title(text)
        return title
    except Exception:
        logger.warning("chat title generation failed", exc_info=True)
        return _fallback_title(text)
