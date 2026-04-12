# Feature 6: AI Document Suggestions

AI-powered extraction layer that analyzes uploaded medical documents and proposes structured profile updates (conditions, medications, allergies, lab results) for the patient to accept or reject. Nothing is written to the patient profile without explicit human confirmation.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 6th (after Document Upload & Storage)

**Feature flag:** `AI_SUGGESTIONS_ENABLED` — defaults to `true` during development, will be flipped to `false` before production. When disabled, document uploads skip the extraction pipeline entirely and the suggestion UI is hidden.

**Auth:** Uses the same dev identity picker as all Phase B features. No JWT or authentication in this plan (Phase E).

---

## Problem

When patients upload medical documents (lab reports, prescriptions, imaging reports), the structured data inside those documents (medications, conditions, lab values, allergies) doesn't flow into the patient's profile. The patient must manually re-enter information that already exists in their uploaded files. This creates:

1. **Duplicate effort** — patient uploads a prescription PDF, then manually types the same medications into their profile
2. **Incomplete profiles** — patients skip manual entry, leaving dashboard cards empty despite having rich documents on file
3. **Data drift** — uploaded documents contain newer information than the manually maintained profile

---

## Industry context and design principles

Based on health tech industry best practices:

1. **Human-in-the-loop (HITL) is mandatory for medical data.** AI proposes, human disposes. No auto-commit to the patient record. This is the pattern used by Apple Health, MyChart, and most serious health platforms.

2. **Gemini structured output** is the technical approach. Both Gemini and OpenAI support JSON schema-constrained output, ensuring extraction results match a defined Pydantic schema. Gemini's structured output mode guarantees valid JSON adhering to a specified schema — no parsing ambiguity.

3. **Confidence signaling matters.** The AI should indicate how confident it is about each extracted field so the patient can prioritize what to review. Low-confidence suggestions get extra visual emphasis to invite scrutiny.

4. **Suggestions are ephemeral until accepted.** They live in a `suggestions` collection with a lifecycle (pending → accepted/rejected/expired). Rejected suggestions are never re-proposed for the same document.

5. **Extraction is bounded and async.** One LLM call per document upload, triggered as a background task. The patient sees suggestions appear on their next page load or via a notification badge — not as a blocking upload step.

6. **Feature flag gates the entire pipeline.** When `AI_SUGGESTIONS_ENABLED=false`, the upload endpoint skips extraction, the suggestions API returns empty results, and the frontend hides the suggestions UI.

---

## Design

### User flow

```
Patient uploads document
        │
        ▼
Upload completes → success toast (immediate)
        │
        ▼ (background, non-blocking)
AI extraction runs on document text
        │
        ▼
Suggestions stored in DB (status: pending)
        │
        ▼
Patient navigates to Dashboard or Profile
        │
        ▼
Notification badge: "3 new suggestions from your uploaded document"
        │
        ▼
Patient opens Suggestions Panel
        │
        ▼
┌───────────────────────────────────────────────────┐
│  Suggestions from "Blood Test Results Jan 2025"   │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🔬 New Lab Result                           │  │
│  │ Fasting Glucose: 138 mg/dL (elevated)       │  │
│  │ Confidence: High                            │  │
│  │                        [Accept] [Reject]    │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 💊 New Medication                           │  │
│  │ Metformin 1000mg — Twice daily              │  │
│  │ ⚠ Already in profile (dosage matches)       │  │
│  │ Confidence: High                            │  │
│  │                  [Already Added] [Dismiss]  │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ ⚠️ New Allergy                              │  │
│  │ Contrast dye — Mild reaction noted          │  │
│  │ Confidence: Medium                          │  │
│  │                        [Accept] [Reject]    │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│         [Accept All]  [Dismiss All]               │
└───────────────────────────────────────────────────┘
```

### Suggestion categories

| Category | Profile field updated | Source documents |
|----------|---------------------|-----------------|
| `condition` | `patient_profile.conditions[]` | Clinical notes, discharge summaries |
| `allergy` | `patient_profile.allergies[]` | Any document mentioning allergies/reactions |
| `medication` | Dashboard display (medications from Markdown; profile field in future) | Prescriptions, clinical notes |
| `lab_result` | Dashboard display (lab reports from Markdown; structured storage in future) | Lab reports |

**Phase B scope note:** Medications and lab results currently come from Markdown files and are displayed on the dashboard via the parser. In Phase B, AI suggestions for medications and lab results are stored in the `suggestions` collection and displayed in the suggestions panel for review. Accepting them does **not** yet write to the Markdown files or a new DB collection — that storage migration is deferred. Accepting a condition or allergy suggestion **does** write to the patient profile (`users` collection) immediately, since those fields already exist in the profile schema.

For medications and lab results: accepting marks the suggestion as `accepted` in the suggestions collection. A future migration (post-Phase B) will add `medications` and `lab_results` as first-class profile fields or a separate collection, at which point accepted suggestions can be auto-migrated.

---

## Data model

### MongoDB collection: `suggestions`

```json
{
  "_id": ObjectId,
  "suggestion_id": "uuid-string",
  "patient_id": "uuid-string",
  "document_id": "uuid-string",
  "category": "condition",
  "status": "pending",
  "confidence": "high",
  "extracted_data": {
    "name": "Hypertension",
    "diagnosed_year": 2018,
    "status": "active",
    "notes": "Stage 2, well-controlled with medication"
  },
  "source_text": "Patient diagnosed with Stage 2 Hypertension in 2018...",
  "duplicate_of": null,
  "created_at": ISODate,
  "resolved_at": null,
  "resolved_by": "patient"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `suggestion_id` | UUID string | Stable external identifier |
| `patient_id` | UUID string | FK to `users.user_id` |
| `document_id` | UUID string | FK to `documents.document_id` — the source document |
| `category` | enum | `condition`, `allergy`, `medication`, `lab_result` |
| `status` | enum | `pending`, `accepted`, `rejected`, `expired` |
| `confidence` | enum | `high`, `medium`, `low` |
| `extracted_data` | object | Shape varies by category (see schemas below) |
| `source_text` | string | The verbatim snippet from the document that the AI based the extraction on — enables traceability |
| `duplicate_of` | string or null | If the extracted item matches an existing profile entry, this holds a description (e.g., "Matches existing condition: Hypertension") |
| `created_at` | ISODate | When the suggestion was generated |
| `resolved_at` | ISODate or null | When the patient accepted/rejected |
| `resolved_by` | string | `"patient"` (future: `"doctor"`, `"auto_expired"`) |

### Indexes

```javascript
db.suggestions.createIndex({ suggestion_id: 1 }, { unique: true });
db.suggestions.createIndex({ patient_id: 1, status: 1, created_at: -1 });
db.suggestions.createIndex({ document_id: 1 });
```

### `extracted_data` shapes by category

**Condition:**
```json
{ "name": "Type 2 Diabetes", "diagnosed_year": 2020, "status": "active", "notes": "HbA1c 7.2%" }
```

**Allergy:**
```json
{ "substance": "Penicillin", "reaction": "Rash and hives", "documented_date": "2005" }
```

**Medication:**
```json
{ "name": "Metformin", "dosage": "1000 mg", "frequency": "Twice daily", "since": "2020" }
```

**Lab result:**
```json
{
  "date": "2025-01-15",
  "results": [
    { "name": "Fasting Glucose", "value": "138 mg/dL", "status": "elevated", "reference_range": "70-100 mg/dL" },
    { "name": "HbA1c", "value": "7.2%", "status": "elevated", "reference_range": "<7.0%" }
  ]
}
```

These shapes intentionally mirror the existing Pydantic models from `PLAN_PATIENT_REGISTRATION_PROFILE.md` (Condition, Allergy) and `PLAN_MEDICAL_HISTORY_DASHBOARD.md` (Medication, LabResult) — so accepting a suggestion produces data that can be written directly to the profile or dashboard response without transformation.

---

## Backend

### Configuration

Add to `backend/app/config.py` (`Settings` class):

```python
AI_SUGGESTIONS_ENABLED: bool = True
```

Add to `docker-compose.yml` backend environment:

```yaml
- AI_SUGGESTIONS_ENABLED=true
```

The feature flag is checked at three points:
1. **Upload hook** — skip extraction if disabled
2. **Suggestions API** — return empty list if disabled
3. **Frontend** — hide suggestions UI if feature config says disabled

A new endpoint exposes the flag to the frontend:

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/config/features` | `{ "ai_suggestions_enabled": true }` |

### Text extraction utility (`backend/app/utils/document_text.py`)

Before the LLM can extract structured data, the document's text content must be available. This utility handles the conversion:

| File type | Extraction method | Library |
|-----------|------------------|---------|
| PDF | Text layer extraction | `PyPDF2` (or `pdfplumber` for table-heavy PDFs) |
| JPEG/PNG | OCR | `pytesseract` + `Pillow` (Tesseract OCR engine) |

```python
async def extract_text_from_document(file_bytes: bytes, content_type: str) -> str:
    """Extract readable text from a PDF or image document.
    
    Returns empty string if extraction fails (non-fatal).
    """
```

**Tesseract dependency:** The backend Dockerfile needs `tesseract-ocr` installed as a system package. This is a one-line addition to the Dockerfile (`apt-get install -y tesseract-ocr`).

**Fallback:** If text extraction fails or returns empty/garbage, the extraction pipeline skips LLM analysis and logs a warning. No suggestions are generated — this is expected for some image formats (X-rays, scans with no text).

### LLM extraction service (`backend/app/service/ai_suggestions.py`)

The core extraction logic. Uses the existing LLM infrastructure (`app/ai/llm.py`) with a dedicated prompt and structured output schema.

```python
async def extract_suggestions_from_document(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    document_id: str,
    document_text: str,
    document_category: str,
) -> list[dict]:
    """Run LLM extraction on document text and store suggestions."""
```

#### LLM prompt strategy

The extraction prompt is category-aware — different document types get tailored extraction instructions:

| Document category | Extraction targets |
|-------------------|-------------------|
| `lab_result` | Lab results (primary), conditions (if mentioned) |
| `prescription` | Medications (primary), conditions (if mentioned) |
| `clinical_note` | Conditions, medications, allergies, lab results |
| `imaging` | Conditions (findings), notes |
| `other` | All categories (best-effort) |

**Prompt template** (`backend/app/ai/extraction_prompts.py`):

```python
EXTRACTION_SYSTEM_PROMPT = """You are a medical document analyzer. Extract structured medical information from the provided document text.

Rules:
- Only extract information explicitly stated in the document. Never infer or fabricate data.
- For each extracted item, include the exact source text snippet that supports it.
- Assign a confidence level: "high" if the information is clearly and unambiguously stated, "medium" if it requires some interpretation, "low" if it is implied or partially legible.
- If the document contains no extractable medical information, return an empty items list.
- Extract dates in ISO format (YYYY-MM-DD) when available, or year-only (YYYY) when only the year is mentioned.

The document category is: {document_category}
Focus on extracting: {extraction_targets}
"""
```

#### Structured output schema

Use Gemini's structured output / OpenAI's function calling to enforce the response schema:

```python
class ExtractedItem(BaseModel):
    category: Literal["condition", "allergy", "medication", "lab_result"]
    confidence: Literal["high", "medium", "low"]
    extracted_data: dict  # shape varies by category
    source_text: str

class ExtractionResponse(BaseModel):
    items: list[ExtractedItem]
```

For Gemini, this is passed via `response_schema` in the `generate_content` call. For OpenAI, it uses function calling with the equivalent JSON schema.

#### Duplicate detection

After extraction, before storing suggestions, run a deduplication check against the patient's existing profile:

```python
async def check_duplicates(
    db: AsyncIOMotorDatabase,
    patient_id: str,
    items: list[ExtractedItem],
) -> list[ExtractedItem]:
    """Mark items that duplicate existing profile entries."""
```

Logic:
- **Conditions:** Fuzzy match on `name` (case-insensitive, Levenshtein distance ≤ 2 or substring match). If matched, set `duplicate_of` to the existing condition name.
- **Allergies:** Exact match on `substance` (case-insensitive). If matched, mark as duplicate.
- **Medications:** Exact match on `name` (case-insensitive). If matched and dosage differs, flag as "dosage change" rather than pure duplicate.
- **Lab results:** No deduplication (labs are time-series data; a new report is always new).

Duplicates are still stored as suggestions but with `duplicate_of` populated, and the UI shows them differently ("Already in your profile").

### Background task execution

The extraction pipeline is triggered **after** a successful document upload, as a FastAPI background task:

```python
@router.post("/{patient_id}/documents", status_code=201)
async def upload_document(
    patient_id: str,
    file: UploadFile = File(...),
    category: str = Form("other"),
    description: str = Form(""),
    db: AsyncIOMotorDatabase = Depends(get_database),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    result = await document_service.upload_document(db, patient_id, file, category, description)
    
    settings = get_settings()
    if settings.AI_SUGGESTIONS_ENABLED:
        background_tasks.add_task(
            extraction_service.process_document_for_suggestions,
            db, patient_id, result.document_id, category
        )
    
    return result
```

**Why BackgroundTasks and not Celery/Redis?** The prototype scale doesn't warrant a separate task queue. FastAPI's `BackgroundTasks` runs in the same process after the response is sent. For production scale, this would migrate to Celery or similar — the service function interface stays the same.

### Extraction pipeline flow

```
process_document_for_suggestions(db, patient_id, document_id, category)
    │
    ├── 1. Check feature flag (bail if disabled)
    │
    ├── 2. Fetch document binary from GridFS
    │
    ├── 3. Extract text (PDF text layer or OCR for images)
    │       └── If empty/failed → log warning, return (no suggestions)
    │
    ├── 4. Build extraction prompt (category-aware)
    │
    ├── 5. Call LLM with structured output schema
    │       └── Timeout: 60 seconds. On failure → log error, return
    │
    ├── 6. Parse LLM response into ExtractedItem list
    │
    ├── 7. Run duplicate detection against patient profile
    │
    ├── 8. Store suggestions in `suggestions` collection (status: pending)
    │
    └── 9. Log summary: "Generated N suggestions for document X"
```

### Suggestions API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/patients/{patient_id}/suggestions` | List pending suggestions (optionally filter by `document_id`, `category`) |
| `PUT` | `/api/patients/{patient_id}/suggestions/{suggestion_id}/accept` | Accept a suggestion → apply to profile |
| `PUT` | `/api/patients/{patient_id}/suggestions/{suggestion_id}/reject` | Reject a suggestion |
| `POST` | `/api/patients/{patient_id}/suggestions/accept-all` | Batch accept all pending (or filtered by `document_id`) |
| `POST` | `/api/patients/{patient_id}/suggestions/reject-all` | Batch reject all pending (or filtered by `document_id`) |

#### Accept logic

When a suggestion is accepted:

1. **Condition:** Append to `patient_profile.conditions[]` in `users` collection via `$push`. Skip if duplicate.
2. **Allergy:** Append to `patient_profile.allergies[]` in `users` collection via `$push`. Skip if duplicate.
3. **Medication:** Mark suggestion as `accepted`. (No profile write in Phase B — medications live in Markdown. Future: write to a `medications` collection.)
4. **Lab result:** Mark suggestion as `accepted`. (No profile write in Phase B — lab data lives in Markdown. Future: write to a `lab_results` collection.)

After the profile update (if any), set `status: "accepted"` and `resolved_at: now()` on the suggestion.

#### Schemas

```python
class SuggestionResponse(BaseModel):
    suggestion_id: str
    patient_id: str
    document_id: str
    category: str
    status: str
    confidence: str
    extracted_data: dict
    source_text: str
    duplicate_of: str | None
    created_at: str

class SuggestionListResponse(BaseModel):
    suggestions: list[SuggestionResponse]
    total: int
    pending_count: int
```

### Repository (`backend/app/repository/suggestion.py`)

| Function | Description |
|----------|-------------|
| `create_suggestions(db, suggestions)` | Bulk insert into `suggestions` collection |
| `list_suggestions(db, patient_id, status, document_id, category)` | Filtered list query |
| `get_suggestion(db, suggestion_id)` | Fetch single suggestion |
| `update_suggestion_status(db, suggestion_id, status)` | Set status + resolved_at |
| `count_pending(db, patient_id)` | Count pending suggestions for badge |
| `bulk_update_status(db, patient_id, status, document_id)` | Batch accept/reject |

### Service (`backend/app/service/suggestion.py`)

| Function | Description |
|----------|-------------|
| `list_patient_suggestions(db, patient_id, ...)` | Fetch + format for API response |
| `accept_suggestion(db, patient_id, suggestion_id)` | Apply to profile (if applicable) + update status |
| `reject_suggestion(db, patient_id, suggestion_id)` | Update status only |
| `accept_all_suggestions(db, patient_id, document_id)` | Batch accept |
| `reject_all_suggestions(db, patient_id, document_id)` | Batch reject |
| `get_pending_count(db, patient_id)` | For notification badge |

---

## Frontend

### Feature flag awareness

The frontend fetches feature configuration on app initialization:

```typescript
// frontend/src/api/config.ts
export async function getFeatureFlags(): Promise<FeatureFlags> {
  return request<FeatureFlags>("/config/features");
}

interface FeatureFlags {
  ai_suggestions_enabled: boolean;
}
```

A `FeatureFlagContext` provides `aiSuggestionsEnabled` to all components. When `false`, suggestion-related UI is not rendered.

### Suggestions notification badge

A small badge on the Dashboard sidebar item and/or a banner on the Dashboard page showing the count of pending suggestions:

```
┌────────────────────────────────────┐
│ 📋 Dashboard                  (3) │  ← badge count
│ 👤 Profile                        │
│ 📄 Documents                      │
└────────────────────────────────────┘
```

Uses `GET /api/patients/{patient_id}/suggestions?status=pending` (count only) polled on navigation or after upload.

### Suggestions panel

A dedicated panel/section accessible from:
1. **Dashboard page** — "Review Suggestions" banner card at the top when pending suggestions exist
2. **After upload** — toast notification with link: "AI found 3 items in your document. [Review]"

The panel is **not** a separate page — it's a slide-over panel (drawer) or an expandable section on the Dashboard, keeping the patient in context.

#### Panel components

| Component | Purpose |
|-----------|---------|
| `SuggestionsPanel` | Container: fetches suggestions, renders list, handles bulk actions |
| `SuggestionCard` | Individual suggestion with category icon, extracted data, confidence badge, source snippet, accept/reject buttons |
| `SuggestionsBanner` | Dashboard banner showing pending count + "Review" CTA |
| `SuggestionsBadge` | Small count badge for sidebar navigation |
| `ConfidenceBadge` | Visual indicator: green (high), yellow (medium), red (low) |
| `DuplicateIndicator` | "Already in your profile" label with match details |

#### SuggestionCard layout

```
┌──────────────────────────────────────────────────┐
│  [💊 Medication]              Confidence: 🟢 High │
│                                                   │
│  Metformin 1000 mg — Twice daily (with meals)     │
│  Since: 2020                                      │
│                                                   │
│  Source: "...prescribed Metformin 1000mg twice     │
│  daily with meals, started January 2020..."        │
│                                                   │
│                          [✓ Accept]  [✗ Reject]   │
└──────────────────────────────────────────────────┘
```

For duplicates:

```
┌──────────────────────────────────────────────────┐
│  [💊 Medication]              Confidence: 🟢 High │
│                                                   │
│  Metformin 1000 mg — Twice daily (with meals)     │
│                                                   │
│  ℹ️ Already in your profile (dosage matches)      │
│                                                   │
│                     [Already Added]  [Dismiss]    │
└──────────────────────────────────────────────────┘
```

#### Interaction behavior

| Action | Result |
|--------|--------|
| Accept | `PUT .../suggestions/{id}/accept` → card animates out, count decrements, success toast: "Added to your profile" (for conditions/allergies) or "Noted" (for meds/labs) |
| Reject | `PUT .../suggestions/{id}/reject` → card animates out, count decrements |
| Accept All | `POST .../suggestions/accept-all` → all cards clear, success toast |
| Dismiss All | `POST .../suggestions/reject-all` → all cards clear |
| Dismiss duplicate | Same as reject — marks it resolved so it won't reappear |

#### After upload integration

Modify the existing upload success flow in `UploadModal` / `DocumentsPage`:

```
Upload succeeds
    │
    ├── Show success toast: "Document uploaded successfully"
    │
    └── If AI_SUGGESTIONS_ENABLED:
            Show secondary toast (after 2s delay, giving extraction time):
            "AI is analyzing your document for profile suggestions..."
            
            After ~5-10 seconds (or on next Dashboard visit):
            Badge updates with new pending count
```

The delay between upload and suggestions appearing is **expected and acceptable** — extraction takes a few seconds. The UI does not block or show a spinner for extraction. The patient discovers suggestions organically when they next visit the Dashboard or check the notification badge.

### API client (`frontend/src/api/suggestions.ts`)

```typescript
export async function listSuggestions(
  patientId: string,
  options?: { status?: string; documentId?: string; category?: string }
): Promise<SuggestionListResponse> { ... }

export async function acceptSuggestion(
  patientId: string,
  suggestionId: string
): Promise<void> { ... }

export async function rejectSuggestion(
  patientId: string,
  suggestionId: string
): Promise<void> { ... }

export async function acceptAllSuggestions(
  patientId: string,
  documentId?: string
): Promise<void> { ... }

export async function rejectAllSuggestions(
  patientId: string,
  documentId?: string
): Promise<void> { ... }

export async function getPendingSuggestionCount(
  patientId: string
): Promise<number> { ... }
```

### TypeScript types (`frontend/src/types/suggestion.ts`)

```typescript
export type SuggestionCategory = "condition" | "allergy" | "medication" | "lab_result";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "expired";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface Suggestion {
  suggestion_id: string;
  patient_id: string;
  document_id: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  confidence: ConfidenceLevel;
  extracted_data: Record<string, unknown>;
  source_text: string;
  duplicate_of: string | null;
  created_at: string;
}

export interface SuggestionListResponse {
  suggestions: Suggestion[];
  total: number;
  pending_count: number;
}
```

### Custom hook (`frontend/src/hooks/useSuggestions.ts`)

```typescript
export function useSuggestions() {
  const { currentPatientId } = usePatientContext();
  const { aiSuggestionsEnabled } = useFeatureFlags();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch pending suggestions
  // Accept/reject handlers that optimistically update local state
  // Re-fetch after bulk operations

  return { suggestions, pendingCount, isLoading, accept, reject, acceptAll, rejectAll, refresh };
}
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/ai/extraction_prompts.py` | LLM prompt templates for document extraction |
| `backend/app/utils/document_text.py` | PDF text extraction + OCR utility |
| `backend/app/service/ai_suggestions.py` | Extraction pipeline: text → LLM → suggestions |
| `backend/app/service/suggestion.py` | Suggestion CRUD + accept/reject business logic |
| `backend/app/repository/suggestion.py` | MongoDB CRUD for `suggestions` collection |
| `backend/app/schemas/suggestion.py` | Pydantic models for suggestion API |
| `backend/app/api/suggestions.py` | Suggestion REST endpoints |
| `backend/app/api/config.py` | Feature flag endpoint (`/api/config/features`) |
| `frontend/src/types/suggestion.ts` | Suggestion TypeScript types |
| `frontend/src/api/suggestions.ts` | Suggestion API client |
| `frontend/src/api/config.ts` | Feature flag API client |
| `frontend/src/contexts/FeatureFlagContext.tsx` | Feature flag React context + provider |
| `frontend/src/hooks/useSuggestions.ts` | Suggestion data fetching + action hook |
| `frontend/src/components/suggestions/SuggestionsPanel.tsx` | Slide-over panel container |
| `frontend/src/components/suggestions/SuggestionCard.tsx` | Individual suggestion card |
| `frontend/src/components/suggestions/SuggestionsBanner.tsx` | Dashboard banner CTA |
| `frontend/src/components/suggestions/SuggestionsBadge.tsx` | Sidebar count badge |
| `frontend/src/components/suggestions/ConfidenceBadge.tsx` | High/medium/low indicator |
| `frontend/src/components/suggestions/DuplicateIndicator.tsx` | "Already in profile" label |

### Modified files

| File | Change |
|------|--------|
| `backend/app/config.py` | Add `AI_SUGGESTIONS_ENABLED: bool = True` |
| `backend/app/api/router.py` | Mount suggestion routes + config route |
| `backend/app/api/documents.py` | Add background task trigger after upload |
| `backend/requirements.txt` | Add `PyPDF2`, `pytesseract`, `Pillow` |
| `backend/Dockerfile` | Add `tesseract-ocr` apt package |
| `docker-compose.yml` | Add `AI_SUGGESTIONS_ENABLED` env var |
| `init-mongo.js` | Add `suggestions` collection + indexes |
| `frontend/src/pages/DashboardPage.tsx` | Add `SuggestionsBanner` at top |
| `frontend/src/components/documents/UploadModal.tsx` | Add post-upload toast about AI analysis |
| `frontend/src/App.tsx` (or root layout) | Wrap with `FeatureFlagProvider` |
| Sidebar/navigation component | Add `SuggestionsBadge` to Dashboard nav item |

---

## Implementation steps

### Phase 1: Backend infrastructure (feature flag + data layer)

1. **Add `AI_SUGGESTIONS_ENABLED` to Settings** in `config.py` and `docker-compose.yml`
2. **Create feature flag endpoint** (`GET /api/config/features`)
3. **Add `suggestions` collection and indexes** to `init-mongo.js`
4. **Create suggestion schemas** (`schemas/suggestion.py`)
5. **Create suggestion repository** (`repository/suggestion.py`)
6. **Create suggestion service** (`service/suggestion.py`) — CRUD + accept/reject + profile write logic

### Phase 2: Extraction pipeline

7. **Add `PyPDF2`, `pytesseract`, `Pillow`** to `requirements.txt`
8. **Add `tesseract-ocr`** to backend Dockerfile
9. **Create text extraction utility** (`utils/document_text.py`)
10. **Create extraction prompts** (`ai/extraction_prompts.py`)
11. **Create AI suggestions service** (`service/ai_suggestions.py`) — the full pipeline from document → text → LLM → suggestions
12. **Wire background task** into document upload endpoint
13. **Test extraction** with existing patient documents (manually upload a PDF and verify suggestions are generated)

### Phase 3: Suggestions API

14. **Create suggestions API routes** (`api/suggestions.py`) — list, accept, reject, bulk actions
15. **Mount routes** in router
16. **Test API** — list pending, accept (verify profile update for conditions/allergies), reject

### Phase 4: Frontend feature flag + types

17. **Create feature flag API client** and `FeatureFlagContext`
18. **Wrap app with `FeatureFlagProvider`**
19. **Create suggestion TypeScript types** (`types/suggestion.ts`)
20. **Create suggestion API client** (`api/suggestions.ts`)
21. **Create `useSuggestions` hook**

### Phase 5: Frontend suggestion UI

22. **Build `ConfidenceBadge`** and **`DuplicateIndicator`** components
23. **Build `SuggestionCard`** component with accept/reject buttons
24. **Build `SuggestionsPanel`** with list + bulk actions
25. **Build `SuggestionsBanner`** for Dashboard top section
26. **Build `SuggestionsBadge`** for sidebar
27. **Integrate banner into DashboardPage**
28. **Add post-upload toast** to `UploadModal`

### Phase 6: Integration testing

29. **End-to-end test:** upload PDF → extraction runs → suggestions appear → accept → profile updated
30. **Test feature flag off:** upload → no extraction → no suggestions UI
31. **Test duplicate detection:** upload document with data already in profile → duplicates flagged
32. **Test error handling:** upload image with no text → graceful fallback, no suggestions

---

## Error handling

| Scenario | Backend behavior | Frontend behavior |
|----------|-----------------|-------------------|
| Text extraction fails (corrupted PDF, empty image) | Log warning, skip extraction, no suggestions generated | No effect — patient never sees a spinner for extraction |
| LLM call fails (timeout, API error) | Log error, no suggestions stored | Same — silent failure, no broken UI |
| LLM returns invalid/empty extraction | Log warning, store zero suggestions | No suggestions panel shown |
| Accept fails (DB write error) | 500 with detail | Toast error: "Could not apply suggestion. Try again." |
| Feature flag disabled | All suggestion endpoints return empty/204 | Suggestion UI not rendered |
| Document deleted while suggestions pending | Suggestions remain (orphaned) — acceptable for prototype; future: cascade delete | Suggestion shows but source document link is broken — mark as "(document removed)" |

---

## Cost analysis

| Cost driver | Per-document cost | Monthly estimate (100 uploads/month) |
|-------------|------------------|--------------------------------------|
| PDF text extraction (PyPDF2) | ~0 (local CPU) | ~0 |
| OCR (Tesseract, local) | ~0 (local CPU, ~2-5s per image) | ~0 |
| LLM extraction call (Gemini Flash) | ~$0.001-0.005 per doc (few hundred tokens in, structured out) | ~$0.10-0.50 |
| LLM extraction call (GPT-4o-mini) | ~$0.002-0.01 per doc | ~$0.20-1.00 |
| MongoDB storage (suggestions) | Negligible | Negligible |

**Total incremental cost: under $1/month at prototype scale.** The dominant cost is the LLM call, which is one call per upload using a fast/cheap model (Gemini Flash or GPT-4o-mini). This is bounded — no ongoing reprocessing.

---

## Security and privacy considerations

1. **Document text is sent to the LLM provider.** The same provider already processes patient chat queries, so no new data boundary is crossed. The extraction prompt sends document text content, not the raw binary.
2. **Suggestions collection stores extracted snippets.** This is derived data from documents the patient uploaded. Same access controls apply.
3. **No auto-commit.** The patient must explicitly accept before any profile change occurs. This is the core safety mechanism.
4. **Audit trail.** Every suggestion records `created_at`, `resolved_at`, `resolved_by`, `source_text`, and `document_id` — full traceability from extraction to profile change.

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| PDF text extraction returns content | Unit | PyPDF2 integration |
| Image OCR returns text | Unit | Tesseract integration |
| Extraction prompt produces valid schema | Unit | LLM structured output |
| Extraction handles empty document text | Unit | Graceful skip |
| Duplicate detection matches existing conditions | Unit | Fuzzy matching logic |
| Duplicate detection skips lab results | Unit | Time-series data not deduplicated |
| Suggestions API lists pending only | API | Status filtering |
| Accept condition suggestion updates profile | API | `users` collection updated |
| Accept medication suggestion does not update profile | API | Only status changes (Phase B) |
| Reject suggestion sets status | API | Status + resolved_at updated |
| Bulk accept/reject works | API | All matching suggestions resolved |
| Feature flag off → extraction skipped | API | No suggestions created on upload |
| Feature flag off → API returns empty | API | Empty response, not 404 |
| SuggestionCard renders all fields | Frontend | Visual completeness |
| Accept button calls API and removes card | Frontend | Optimistic UI |
| Badge shows correct pending count | Frontend | Count updates after accept/reject |
| Suggestions hidden when feature flag off | Frontend | Conditional rendering |
| End-to-end: upload → suggestions → accept → profile | Integration | Full pipeline |

---

## Future enhancements (out of scope)

- **Suggestion expiry:** Auto-expire suggestions after N days if not acted on
- **Doctor review:** In Phase C, doctors can review and approve/reject patient suggestions, adding a clinical validation layer
- **Batch document processing:** Re-analyze previously uploaded documents when the extraction pipeline improves
- **Medications and lab results as first-class DB entities:** Move from Markdown to a `medications` / `lab_results` collection, making accept-for-meds/labs write to DB
- **Streaming extraction status:** WebSocket or SSE push to show "Analyzing your document..." in real-time
- **Multi-page document chunking:** For very long documents, chunk text and run multiple extraction passes
- **Vision model integration:** For X-rays and imaging, use a vision-capable LLM (Gemini Pro Vision) instead of OCR + text LLM

---

*Created: 2026-04-12 — AI Document Suggestions plan (Phase B Feature 6)*
