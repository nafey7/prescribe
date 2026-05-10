from typing import Literal

from pydantic import BaseModel

AIProvider = Literal["openai", "gemini"]


class AIProviderResponse(BaseModel):
    provider: AIProvider
    available_providers: list[AIProvider]
    openai_key_present: bool
    gemini_key_present: bool


class AIProviderRequest(BaseModel):
    provider: AIProvider
