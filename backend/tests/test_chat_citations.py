from unittest.mock import AsyncMock

import pytest

from app.schemas.chat import ChatResponse
from app.service.citations import extract_citation_source_ids, resolve_citation_sources


class _Documents:
    def __init__(self, rows: dict[str, dict]):
        self.rows = rows

    async def find_one(self, query: dict):
        row = self.rows.get(query["document_id"])
        if row and row.get("patient_id") == query["patient_id"]:
            return row
        return None


class _Db:
    def __init__(self):
        self.documents = _Documents(
            {
                "doc-1": {
                    "document_id": "doc-1",
                    "patient_id": "user-1",
                    "filename": "cbc.pdf",
                    "category": "lab_result",
                },
                "other-doc": {
                    "document_id": "other-doc",
                    "patient_id": "other-user",
                    "filename": "private.pdf",
                },
            }
        )


def test_extract_citation_source_ids_is_ordered_and_deduplicated():
    answer = (
        "Metformin [Profile](#citation-profile-medications). "
        "CBC [Lab](#citation-document-doc-1). "
        "Again [Profile](#citation-profile-medications)."
    )
    assert extract_citation_source_ids(answer) == [
        "profile-medications",
        "document-doc-1",
    ]


@pytest.mark.asyncio
async def test_resolve_citation_sources_scopes_documents_to_patient(monkeypatch):
    monkeypatch.setattr(
        "app.service.citations.find_patient_by_id_or_slug",
        AsyncMock(return_value={"user_id": "user-1"}),
    )
    answer = (
        "[Meds](#citation-profile-medications) "
        "[CBC](#citation-document-doc-1) "
        "[Wrong patient](#citation-document-other-doc) "
        "[Unknown](#citation-made-up)"
    )
    sources = await resolve_citation_sources(_Db(), "patient-slug", answer)

    assert [source.source_id for source in sources] == [
        "profile-medications",
        "document-doc-1",
    ]
    assert sources[1].title == "cbc.pdf"
    assert sources[1].detail == "Lab Result"


@pytest.mark.asyncio
async def test_resolve_citation_sources_rejects_sources_when_patient_is_missing(monkeypatch):
    monkeypatch.setattr(
        "app.service.citations.find_patient_by_id_or_slug",
        AsyncMock(return_value=None),
    )
    sources = await resolve_citation_sources(
        _Db(), "missing", "[Profile](#citation-profile-conditions)"
    )
    assert sources == []


def test_chat_response_citations_are_backward_compatible():
    response = ChatResponse(message="Hello", chat_id="c1", message_id="m1")
    assert response.citations == []
