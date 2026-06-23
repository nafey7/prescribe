from typing import Literal

from pydantic import BaseModel


class CitationSource(BaseModel):
    """A source referenced by an inline citation in an assistant message."""

    source_id: str
    source_type: Literal["profile_field", "document"]
    title: str
    detail: str = ""
    profile_field: str | None = None
    document_id: str | None = None
