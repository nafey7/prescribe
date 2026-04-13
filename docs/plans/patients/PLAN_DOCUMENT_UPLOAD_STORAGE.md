# Feature 3: Document Upload & Storage

Upload, store, list, view, and delete medical documents (PDFs, images). Backend storage via MongoDB GridFS with metadata in a `documents` collection. Processing hooks for future AI context extraction. Patient-facing documents page with upload, browse, preview, and download.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 5th (last — depends on UI Shell and Dashboard)

**Auth:** Document APIs are scoped by `patient_id` path params and dev-time headers (see [Dev Identity Picker](./PLAN_DEV_IDENTITY_PICKER.md)), not JWT. **No authentication or authorization hardening** in this plan — that is Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md).

---

## Problem

Patients need to upload and manage their medical documents — lab reports, imaging results, prescriptions, clinical notes. Today the only patient data is static Markdown files. Phase B needs:

1. A file upload pipeline that accepts PDFs and images
2. Persistent storage that works within Docker Compose (no external cloud services)
3. Metadata tracking (who uploaded what, when, what category)
4. A browsable, searchable documents page
5. In-browser preview for supported types (images, PDFs)
6. A hook point for future AI context extraction (Phase C — doctors can ask AI about uploaded documents)

---

## Storage decision: MongoDB GridFS

**Why GridFS over filesystem or S3:**
- Already running MongoDB — no new infrastructure
- Works inside Docker Compose volumes (survives container restarts)
- Supports files larger than 16MB BSON limit by chunking
- Metadata and file storage in the same database — simpler queries
- Good enough for prototype scale (hundreds of files, not millions)
- Can migrate to S3/GCS later if needed — the API layer abstracts storage

**GridFS collections (auto-created):**
- `fs.files` — file metadata (filename, length, upload date, content type)
- `fs.chunks` — binary chunks (255KB each by default)

**Application metadata collection: `documents`** — stores app-level metadata alongside the GridFS reference, since GridFS metadata is limited.

---

## Data model

### MongoDB collection: `documents`

```json
{
  "_id": ObjectId,
  "document_id": "uuid-string",
  "patient_id": "uuid-string",
  "filename": "blood_test_results_2025.pdf",
  "original_filename": "scan_001.pdf",
  "content_type": "application/pdf",
  "file_size_bytes": 245760,
  "gridfs_file_id": ObjectId,
  "category": "lab_result",
  "description": "Complete blood panel from January 2025",
  "tags": ["blood", "lab", "2025"],
  "uploaded_at": ISODate,
  "updated_at": ISODate
}
```

### Document categories

| Category | Description | Accepted types |
|----------|-------------|---------------|
| `lab_result` | Blood tests, urine analysis, pathology | PDF, image |
| `imaging` | X-rays, MRI, CT scans, ultrasound | PDF, image |
| `prescription` | Medication prescriptions | PDF, image |
| `clinical_note` | Doctor visit notes, discharge summaries | PDF, image |
| `insurance` | Insurance cards, claim forms | PDF, image |
| `other` | Anything else | PDF, image |

### Supported file types

| MIME type | Extension | Max size |
|-----------|-----------|----------|
| `application/pdf` | `.pdf` | 10 MB |
| `image/jpeg` | `.jpg`, `.jpeg` | 5 MB |
| `image/png` | `.png` | 5 MB |

### Indexes

```javascript
db.documents.createIndex({ document_id: 1 }, { unique: true });
db.documents.createIndex({ patient_id: 1, uploaded_at: -1 });
db.documents.createIndex({ patient_id: 1, category: 1 });
```

---

## Backend

### Pydantic schemas (`backend/app/schemas/document.py`)

```python
class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    content_type: str
    file_size_bytes: int
    category: str
    description: str
    uploaded_at: str

class DocumentMetadata(BaseModel):
    document_id: str
    patient_id: str
    filename: str
    content_type: str
    file_size_bytes: int
    category: str
    description: str
    tags: list[str]
    uploaded_at: str
    updated_at: str

class DocumentListResponse(BaseModel):
    documents: list[DocumentMetadata]
    total: int
    page: int
    page_size: int

class DocumentUpdateRequest(BaseModel):
    category: str | None = None
    description: str | None = None
    tags: list[str] | None = None
```

### Repository (`backend/app/repository/document.py`)

| Function | Description |
|----------|-------------|
| `upload_file(db, file_data, filename, content_type)` | Store binary in GridFS, return `gridfs_file_id` |
| `create_document(db, metadata)` | Insert into `documents` collection |
| `get_document(db, document_id)` | Fetch document metadata by `document_id` |
| `list_documents(db, patient_id, category, page, page_size)` | Paginated list with optional category filter |
| `update_document(db, document_id, data)` | Update metadata fields (category, description, tags) |
| `delete_document(db, document_id)` | Remove from `documents` and delete GridFS file |
| `get_file_stream(db, gridfs_file_id)` | Return binary stream from GridFS for download |
| `count_documents(db, patient_id, category)` | Count for pagination |

### Service (`backend/app/service/document.py`)

| Function | Description |
|----------|-------------|
| `upload_document(db, patient_id, file, category, description)` | Validate file type/size, store in GridFS, create metadata, return response |
| `get_document_metadata(db, document_id, patient_id)` | Fetch + verify ownership |
| `list_patient_documents(db, patient_id, category, page, page_size)` | Paginated listing |
| `update_document_metadata(db, document_id, patient_id, data)` | Update with ownership check |
| `delete_document(db, document_id, patient_id)` | Delete with ownership check |
| `download_document(db, document_id, patient_id)` | Return stream response with proper content type |

#### Validation rules

```python
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

MAX_FILE_SIZES = {
    "application/pdf": 10 * 1024 * 1024,     # 10 MB
    "image/jpeg": 5 * 1024 * 1024,            # 5 MB
    "image/png": 5 * 1024 * 1024,             # 5 MB
}
```

### API routes (`backend/app/api/documents.py`)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `POST` | `/api/patients/{patient_id}/documents` | `upload_document` | Multipart form: `file` (UploadFile), `category` (str), `description` (str, optional) |
| `GET` | `/api/patients/{patient_id}/documents` | `list_patient_documents` | Query params: `category`, `page`, `page_size` |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}` | `download_document` | Returns binary stream with `Content-Type` and `Content-Disposition` headers |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}/metadata` | `get_document_metadata` | JSON metadata only |
| `PUT` | `/api/patients/{patient_id}/documents/{document_id}` | `update_document_metadata` | Update category, description, tags |
| `DELETE` | `/api/patients/{patient_id}/documents/{document_id}` | `delete_document` | Removes file and metadata |

#### Upload endpoint detail

```python
@router.post("/{patient_id}/documents", status_code=201)
async def upload_document(
    patient_id: str,
    file: UploadFile = File(...),
    category: str = Form("other"),
    description: str = Form(""),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    return await document_service.upload_document(
        db, patient_id, file, category, description
    )
```

---

## Frontend

### Documents page (`frontend/src/pages/DocumentsPage.tsx`)

Layout:

```
┌─────────────────────────────────────────────────┐
│  Documents                    [+ Upload Button] │
├─────────────────────────────────────────────────┤
│  Filter: [All ▾] [Lab Results] [Imaging] [...]  │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐    │
│  │ 📄 Blood Test Results (Jan 2025)        │    │
│  │    Lab Result · PDF · 245 KB            │    │
│  │    Uploaded: 2025-01-15                  │    │
│  │    [View] [Download] [Delete]           │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │ 🖼️ Chest X-Ray (Nov 2024)              │    │
│  │    Imaging · JPEG · 1.2 MB              │    │
│  │    Uploaded: 2024-11-20                  │    │
│  │    [View] [Download] [Delete]           │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ◀ Page 1 of 3 ▶                               │
└─────────────────────────────────────────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| `DocumentsPage` | Page container with upload button, filters, list |
| `UploadModal` | Modal dialog for file upload (drag-and-drop zone + form fields) |
| `DocumentCard` | Individual document display card |
| `DocumentPreview` | In-browser viewer — PDF embed or image display |
| `CategoryFilter` | Pill-style filter buttons for document categories |
| `DocumentPagination` | Page controls |
| `UploadDropzone` | Drag-and-drop file area with click-to-browse fallback |

### Upload flow (UX)

1. Click "Upload" button → `UploadModal` opens
2. Drag file onto drop zone or click to browse
3. File validation (type + size) happens client-side before upload
4. Select category from dropdown, add optional description
5. Click "Upload" → show progress bar
6. On success: close modal, prepend new document to list, show success toast
7. On error: show error message in modal, keep modal open

### Preview behavior

| File type | Preview method |
|-----------|---------------|
| PDF | `<iframe>` or `<embed>` with PDF URL |
| JPEG/PNG | `<img>` tag with object-fit |

Preview opens in a slide-over panel or modal, fetching from `GET /api/patients/{id}/documents/{docId}`.

### API client (`frontend/src/api/documents.ts`)

```typescript
export async function uploadDocument(
  patientId: string,
  file: File,
  category: string,
  description: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  formData.append("description", description);
  // Note: don't set Content-Type header — browser sets multipart boundary
  const res = await fetch(`${API_BASE}/patients/${patientId}/documents`, {
    method: "POST",
    headers: { "X-Patient-Id": patientId },
    body: formData,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function listDocuments(
  patientId: string,
  options?: { category?: string; page?: number; pageSize?: number }
): Promise<DocumentListResponse> { ... }

export async function getDocumentUrl(patientId: string, documentId: string): string {
  return `${API_BASE}/patients/${patientId}/documents/${documentId}`;
}

export async function deleteDocument(patientId: string, documentId: string): Promise<void> { ... }

export async function updateDocumentMetadata(
  patientId: string,
  documentId: string,
  data: DocumentUpdateRequest
): Promise<DocumentMetadata> { ... }
```

### TypeScript types (`frontend/src/types/document.ts`)

```typescript
export interface DocumentMetadata {
  document_id: string;
  patient_id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  category: DocumentCategory;
  description: string;
  tags: string[];
  uploaded_at: string;
  updated_at: string;
}

export type DocumentCategory =
  | "lab_result"
  | "imaging"
  | "prescription"
  | "clinical_note"
  | "insurance"
  | "other";

export interface DocumentListResponse {
  documents: DocumentMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  category: string;
  description: string;
  uploaded_at: string;
}
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/schemas/document.py` | Document Pydantic models |
| `backend/app/repository/document.py` | GridFS + documents collection CRUD |
| `backend/app/service/document.py` | Document business logic + validation |
| `backend/app/api/documents.py` | Document REST endpoints |
| `frontend/src/pages/DocumentsPage.tsx` | Documents page (replaces placeholder) |
| `frontend/src/types/document.ts` | Document TypeScript types |
| `frontend/src/api/documents.ts` | Document API client |
| `frontend/src/hooks/useDocuments.ts` | Document list fetching hook |
| `frontend/src/components/documents/UploadModal.tsx` | Upload dialog |
| `frontend/src/components/documents/UploadDropzone.tsx` | Drag-and-drop zone |
| `frontend/src/components/documents/DocumentCard.tsx` | Individual document card |
| `frontend/src/components/documents/DocumentPreview.tsx` | In-browser file viewer |
| `frontend/src/components/documents/CategoryFilter.tsx` | Category filter pills |

### Modified files

| File | Change |
|------|--------|
| `backend/app/api/router.py` | Mount document routes under patients router |
| `init-mongo.js` | Add `documents` collection creation and indexes |
| `frontend/src/components/dashboard/RecentDocumentsCard.tsx` | Link to documents page, use real data |

---

## Implementation steps

1. **Add `documents` collection and indexes** to `init-mongo.js`
2. **Create backend schemas** (`schemas/document.py`)
3. **Create repository layer** (`repository/document.py`) — GridFS upload/download + metadata CRUD
4. **Create service layer** (`service/document.py`) — validation, ownership checks
5. **Create API routes** (`api/documents.py`) with multipart upload support
6. **Mount routes** in router under `/patients/{patient_id}/documents`
7. **Test upload/download cycle** via curl or API client
8. **Create frontend types and API client** (`types/document.ts`, `api/documents.ts`)
9. **Build `UploadDropzone` and `UploadModal`** components
10. **Build `DocumentCard` and `CategoryFilter`** components
11. **Build `DocumentPreview`** component (PDF embed + image viewer)
12. **Compose `DocumentsPage`** with upload, list, filter, preview, pagination
13. **Wire up `RecentDocumentsCard`** on dashboard to show actual uploads
14. **Test full flow** — upload, list, preview, download, delete

---

## AI context integration (future hook)

When Phase C ships and doctors use AI chat scoped to a patient:

1. `search_patient_records` tool is extended to query the `documents` collection
2. For text-extractable documents (PDFs), a background processing step extracts text content and stores it in a `text_content` field on the document metadata
3. The AI tool searches both Markdown files and extracted document text
4. Image-based documents (scans, X-rays) require OCR or vision model integration — deferred beyond Phase C

The `documents` collection is designed with this in mind: the `category` and `tags` fields enable filtered context retrieval.

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Upload valid PDF | API | 201, file stored in GridFS, metadata created |
| Upload oversized file | API | 413 or 400 with size error |
| Upload unsupported type (.exe) | API | 400 with type error |
| List documents with category filter | API | Correct filtering |
| List documents with pagination | API | Correct page/total |
| Download uploaded file | API | Binary stream, correct content type |
| Delete document | API | Metadata and GridFS file both removed |
| Upload with empty file | API | 400 validation error |
| Upload modal drag-and-drop | Frontend | File accepted, preview shown |
| Upload modal type validation | Frontend | Client-side rejection of bad types |
| Document card renders metadata | Frontend | All fields displayed |
| PDF preview renders in iframe | Frontend | Visible document |
| Image preview renders | Frontend | Visible image |
| Delete confirmation dialog | Frontend | Confirmation required before delete |

---

*Created: 2026-04-12*
