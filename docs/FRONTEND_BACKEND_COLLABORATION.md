# Frontend–Backend Collaboration

API contract, casing conventions, ownership boundaries, and streaming behavior between the React frontend and FastAPI backend.

## Frontend routes (patient portal shell)

Client-side routes (`react-router-dom`, `createBrowserRouter` in `frontend/src/router.tsx`). REST paths below are unchanged; this table is for deep links and QA.

| Path | Layout | Purpose |
|------|--------|---------|
| `/` | `PatientLayout` | Medical history dashboard |
| `/profile` | `PatientLayout` | Profile (current patient from `PatientContext`) |
| `/documents` | `PatientLayout` | Documents |
| `/public/chat` | *(none)* | Public AI chat (not nested under portal shell) |
| `/dashboard` | — | Redirects to `/` |
| `/profile/:userId` | `PatientLayout` | Legacy bookmark: syncs picker, redirects to `/profile` |

## API endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| `POST` | `/api/chat/message` | `ChatRequest` (JSON) + header `X-Patient-Id` | `ChatResponse` (JSON) | Non-streaming message; patient from header (400 if missing) |
| `POST` | `/api/chat/message/stream` | `ChatRequest` (JSON) + header `X-Patient-Id` | SSE stream | Streaming message; patient from header |
| `GET` | `/api/chat/history/{chat_id}` | — | `ChatHistoryResponse` | Chat history |
| `GET` | `/api/chat/patients` | — | `PatientInfo[]` | Legacy alias; same data as `/api/patients/for-chat` |
| `GET` | `/api/patients/for-chat` | — | `PatientInfo[]` | Chat-oriented patient list (Markdown / DB-backed) for dev identity picker |
| `POST` | `/api/patients` | `PatientProfileCreate` (JSON) | `PatientProfileResponse` (201) | Create patient profile (dev / migration; not end-user signup) |
| `GET` | `/api/patients` | Query: `skip`, `limit` | `PatientListResponse` | Paginated patient profiles |
| `GET` | `/api/patients/{patient_id}` | — | `PatientProfileResponse` | Get profile by `user_id` (UUID) or `patient_slug` |
| `GET` | `/api/patients/{patient_id}/medical-history` | — | `MedicalHistoryResponse` | Aggregated dashboard: profile + parsed Markdown (`medications`, labs, timeline) + recent `documents` rows when present |
| `PUT` | `/api/patients/{patient_id}` | `PatientProfileUpdate` (JSON) | `PatientProfileResponse` | Update profile (same id rules as GET) |
| `POST` | `/api/patients/{patient_id}/documents` | Multipart: `file`, `category`, `description` | `DocumentUploadResponse` (201) | Upload PDF/image to GridFS + `documents` metadata |
| `GET` | `/api/patients/{patient_id}/documents` | Query: `category`, `page`, `page_size` | `DocumentListResponse` | Paginated document list (optional category filter) |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}` | — | Binary stream | Download/view file (`Content-Type`, `Content-Disposition: inline`) |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}/metadata` | — | `DocumentMetadata` | JSON metadata only |
| `PUT` | `/api/patients/{patient_id}/documents/{document_id}` | `DocumentUpdateRequest` (JSON) | `DocumentMetadata` | Update category, description, tags |
| `DELETE` | `/api/patients/{patient_id}/documents/{document_id}` | — | 204 | Delete GridFS file and metadata |
| `GET` | `/health` | — | `{ status: "ok" }` | Health check |

## Dev identity header (Phase B)

Until authentication (Phase E), the frontend sends **`X-Patient-Id`** on API requests (via `frontend/src/api/client.ts`) so the active patient matches the dev identity picker. Chat message endpoints **require** this header; other routes may use path-based `patient_id` while still receiving the header for consistency.

## Request/response shapes

### `ChatRequest` (backend Pydantic model)

```python
class ChatRequest(BaseModel):
    message: str       # 1–5000 chars
    chat_id: str | None = None
```

Patient context for chat is **not** in the JSON body; it is supplied by the **`X-Patient-Id`** request header (see `get_current_patient_id` in `backend/app/api/dependencies.py`).

### `ChatResponse`

```python
class ChatResponse(BaseModel):
    message: str
    chat_id: str
    message_id: str
```

### `ChatHistoryResponse`

```python
class ChatHistoryResponse(BaseModel):
    chat_id: str
    messages: list[MessageSchema]  # role, content, timestamp
```

### `PatientInfo`

```python
class PatientInfo(BaseModel):
    id: str    # e.g. "john_doe" — chat `patient_id` / markdown file stem
    name: str  # e.g. "John Doe"
    file: str  # e.g. "patient_john_doe.md"
    user_id: str | None = None  # UUID when row exists in `users`
```

### Frontend TypeScript mirrors

```typescript
interface ChatResponse {
  message: string;
  chat_id: string;
  message_id: string;
}

interface Patient {
  id: string;
  name: string;
  file: string;
  user_id?: string | null;
}
```

### `MedicalHistoryResponse` (summary)

Returned by `GET /api/patients/{patient_id}/medical-history`. JSON uses `snake_case` throughout (e.g. `lab_reports`, `medical_events`, `recent_documents`). Core fields: `patient_id` (UUID), `summary` (name, demographics), `conditions`, `allergies` (from MongoDB profile), `medications`, `lab_reports`, `medical_events` (from `data/patients/patient_{slug}.md` via parser), `family_history`, `lifestyle`, `recent_documents` (from `documents` collection when Feature 3 data exists).

## Casing conventions

| Boundary | Convention | Example |
|----------|-----------|---------|
| Backend Python code | `snake_case` | `patient_id`, `chat_id` |
| API JSON payloads | `snake_case` | `{ "chat_id": "..." }` (chat body); `patient_id` via path or header, not in `ChatRequest` |
| Frontend TypeScript interfaces | `snake_case` (mirrors backend) | `ChatResponse.chat_id` |
| Frontend internal state | `camelCase` | `chatId`, `patientId`, `isLoading` |

The frontend API modules (`api/client.ts`, `api/chat.ts`, `api/patients.ts`, `api/documents.ts`) send `snake_case` in JSON bodies where applicable, attach `X-Patient-Id` from `PatientContext`, and receive `snake_case` in responses. The `useChat` hook maps to `camelCase` for internal React state.

## Streaming protocol (SSE)

The streaming endpoint returns `text/event-stream` with four event types:

```
event: thinking
data: {"status": "Searching patient records..."}

event: token
data: {"content": "Based"}

event: token
data: {"content": " on the patient's records..."}

event: done
data: {"chat_id": "abc-123", "message_id": "msg-456"}

event: error
data: {"detail": "LLM timeout"}
```

### Frontend SSE parsing

`sendMessageStream()` in `api/chat.ts` uses:
- Shared `apiFetch()` from `api/client.ts` (`POST`, not `EventSource`, which only supports GET) so `X-Patient-Id` is attached automatically
- `response.body.getReader()` + `TextDecoder` for chunk reading
- Manual SSE line parsing (`event:` / `data:` lines)
- Callback dispatch to `onThinking`, `onToken`, `onDone`, `onError`

### Token buffering

The `useChat` hook uses `requestAnimationFrame` to batch token updates, preventing excessive React re-renders during fast streaming.

## Ownership boundaries

| Concern | Owner | Notes |
|---------|-------|-------|
| Request validation | Backend (`ChatRequest` Pydantic) | Max message length, required fields |
| Session management | Backend (`service/chat.py`) | UUID generation, session creation |
| AI invocation | Backend (`ai/graph.py`) | LangGraph agent loop |
| Message persistence | Backend (`repository/chat.py`) | MongoDB writes |
| SSE event format | Backend (`service/chat.py` `_format_sse`) | Event structure |
| SSE parsing | Frontend (`api/chat.ts`) | Stream reading, JSON parsing |
| State management | Frontend (`useChat` hook) | Messages, loading, errors |
| Markdown rendering | Frontend (`ChatMessage` component) | react-markdown + remark-gfm |
| Streaming UX | Frontend (components) | Thinking indicator, cursor, RAF buffering |

## Error handling

| Scenario | Backend behavior | Frontend behavior |
|----------|-----------------|-------------------|
| Invalid request | 422 Validation Error | API client throws, error shown in UI |
| AI service failure (non-streaming) | 503 with `detail` | Error message in chat bubble |
| AI error mid-stream | `error` SSE event | `onError` callback → error in chat bubble |
| Network failure | — | `catch` in `useChat` → error in chat bubble |
| Empty AI response | Fallback message sent | Displayed as normal message |
