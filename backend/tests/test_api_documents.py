from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.document import (
    DocumentListResponse,
    DocumentMetadata,
    DocumentUploadResponse,
)


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_list_documents_ok(client):
    sample = DocumentListResponse(
        documents=[
            DocumentMetadata(
                document_id="d1",
                patient_id="u1",
                filename="a.pdf",
                content_type="application/pdf",
                file_size_bytes=100,
                category="other",
                description="",
                tags=[],
                uploaded_at="2025-01-01T00:00:00",
                updated_at="2025-01-01T00:00:00",
            )
        ],
        total=1,
        page=1,
        page_size=20,
    )
    with patch(
        "app.api.documents.document_service.list_patient_documents",
        new_callable=AsyncMock,
    ) as mock_list:
        mock_list.return_value = sample
        r = client.get("/api/patients/john_doe/documents?page=1&page_size=20")
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["documents"][0]["document_id"] == "d1"


def test_list_documents_category_filter(client):
    empty = DocumentListResponse(
        documents=[], total=0, page=1, page_size=20
    )
    with patch(
        "app.api.documents.document_service.list_patient_documents",
        new_callable=AsyncMock,
    ) as mock_list:
        mock_list.return_value = empty
        r = client.get(
            "/api/patients/john_doe/documents?category=lab_result&page=1"
        )
        assert r.status_code == 200
        mock_list.assert_called_once()
        call_kw = mock_list.call_args
        assert call_kw[0][2] == "lab_result"


def test_list_documents_pagination(client):
    empty = DocumentListResponse(
        documents=[], total=50, page=2, page_size=10
    )
    with patch(
        "app.api.documents.document_service.list_patient_documents",
        new_callable=AsyncMock,
    ) as mock_list:
        mock_list.return_value = empty
        r = client.get("/api/patients/john_doe/documents?page=2&page_size=10")
        assert r.status_code == 200
        body = r.json()
        assert body["page"] == 2
        assert body["page_size"] == 10
        assert body["total"] == 50


def test_upload_document_ok(client):
    with patch(
        "app.api.documents.document_service.upload_document",
        new_callable=AsyncMock,
    ) as mock_up:
        mock_up.return_value = DocumentUploadResponse(
            document_id="x",
            filename="f.pdf",
            content_type="application/pdf",
            file_size_bytes=10,
            category="other",
            description="",
            uploaded_at="2025-01-01T00:00:00",
        )
        r = client.post(
            "/api/patients/john_doe/documents",
            files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
            data={"category": "lab_result", "description": "Lab"},
        )
        assert r.status_code == 201


def test_upload_document_empty_file(client):
    with patch(
        "app.api.documents.document_service.upload_document",
        new_callable=AsyncMock,
    ) as mock_up:
        mock_up.side_effect = HTTPException(status_code=400, detail="Empty file")
        r = client.post(
            "/api/patients/john_doe/documents",
            files={"file": ("empty.pdf", b"", "application/pdf")},
            data={"category": "other", "description": ""},
        )
        assert r.status_code == 400
        assert "Empty" in r.json().get("detail", "")


def test_upload_document_oversized(client):
    with patch(
        "app.api.documents.document_service.upload_document",
        new_callable=AsyncMock,
    ) as mock_up:
        mock_up.side_effect = HTTPException(
            status_code=413, detail="File exceeds maximum size"
        )
        r = client.post(
            "/api/patients/john_doe/documents",
            files={"file": ("big.pdf", b"x", "application/pdf")},
            data={"category": "other", "description": ""},
        )
        assert r.status_code == 413


def test_upload_document_bad_type(client):
    with patch(
        "app.api.documents.document_service.upload_document",
        new_callable=AsyncMock,
    ) as mock_up:
        mock_up.side_effect = HTTPException(
            status_code=400, detail="Unsupported file type"
        )
        r = client.post(
            "/api/patients/john_doe/documents",
            files={"file": ("malware.exe", b"MZ", "application/octet-stream")},
            data={"category": "other", "description": ""},
        )
        assert r.status_code == 400


def test_get_metadata_not_found(client):
    with patch(
        "app.api.documents.document_service.get_document_metadata",
        new_callable=AsyncMock,
    ) as mock_g:
        mock_g.side_effect = HTTPException(status_code=404, detail="Document not found")
        r = client.get(
            "/api/patients/john_doe/documents/missing-id/metadata",
        )
        assert r.status_code == 404


def test_download_document_stream(client):
    def chunks():
        yield b"%PDF-1.4"
        yield b"data"

    with patch(
        "app.api.documents.document_service.download_document",
        new_callable=AsyncMock,
    ) as mock_dl:
        mock_dl.return_value = (chunks(), "application/pdf", "report.pdf")
        r = client.get("/api/patients/john_doe/documents/doc-1")
        assert r.status_code == 200
        assert r.headers.get("content-type") == "application/pdf"
        assert "inline" in r.headers.get("content-disposition", "")
        assert r.content == b"%PDF-1.4data"


def test_delete_document_no_content(client):
    with patch(
        "app.api.documents.document_service.delete_document",
        new_callable=AsyncMock,
    ) as mock_del:
        mock_del.return_value = None
        r = client.delete("/api/patients/john_doe/documents/doc-1")
        assert r.status_code == 204


def test_update_metadata_ok(client):
    meta = DocumentMetadata(
        document_id="d1",
        patient_id="u1",
        filename="a.pdf",
        content_type="application/pdf",
        file_size_bytes=10,
        category="lab_result",
        description="Updated",
        tags=["a"],
        uploaded_at="2025-01-01T00:00:00",
        updated_at="2025-01-02T00:00:00",
    )
    with patch(
        "app.api.documents.document_service.update_document_metadata",
        new_callable=AsyncMock,
    ) as mock_u:
        mock_u.return_value = meta
        r = client.put(
            "/api/patients/john_doe/documents/d1",
            json={"description": "Updated", "tags": ["a"]},
        )
        assert r.status_code == 200
        assert r.json()["description"] == "Updated"
