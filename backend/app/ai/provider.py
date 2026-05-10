import threading
from typing import Literal

from app.config import get_settings

AIProvider = Literal["openai", "gemini"]

_lock = threading.Lock()
_active: AIProvider = "openai"  # overwritten by init_from_settings()


def init_from_settings() -> None:
    global _active
    with _lock:
        _active = get_settings().LLM_PROVIDER  # type: ignore[assignment]


def get_active_provider() -> AIProvider:
    with _lock:
        return _active


def set_active_provider(provider: AIProvider) -> None:
    global _active
    with _lock:
        _active = provider


def reset() -> None:
    """Test helper: reset registry to the settings default."""
    init_from_settings()
