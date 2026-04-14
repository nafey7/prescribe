# Frontend–Backend Collaboration

API contract, casing conventions, ownership boundaries, and streaming behavior between the React frontend and FastAPI backend.

## Frontend routes (patient + doctor portals)

Client-side routes (`react-router-dom`, `createBrowserRouter` in `frontend/src/router.tsx`). `RootLayout` wraps `IdentityProvider` → `PatientProvider` → role redirect + `Outlet`. REST paths below are unchanged; this table is for deep links and QA.

| Path | Layout | Purpose |
|------|--------|---------|
| `/` | `PatientLayout` | Medical history dashboard |
| `/profile` | `PatientLayout` | Profile (current patient from `PatientContext`) |
| `/documents` | `PatientLayout` | Documents |
| `/doctor`, `/doctor/...` | `DoctorLayout` | Doctor portal (Phase C): `/doctor/profile`, `/doctor/patients`, `/doctor/patients/:patientId`, `/doctor/patients/:patientId/documents`, `/doctor/patients/:patientId/chat` (doctor–AI, connection-gated), `/doctor/patients/:patientId/prescriptions`, `/doctor/connections` |
| `/public/chat` | — | Redirects to `/doctor` (legacy public chat path retired per Phase C) |
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
| `POST` | `/api/doctors` | `DoctorProfileCreate` (JSON) | `DoctorProfileResponse` (201) | Register doctor profile in `users` (`role: doctor`); 409 if email exists |
| `GET` | `/api/doctors` | Query: `skip`, `limit` | `DoctorListResponse` | Paginated doctor profiles |
| `GET` | `/api/doctors/for-dev` | — | `DoctorInfo[]` | Doctor list for dev identity picker (`users` with `role: doctor`) |
| `GET` | `/api/doctors/{doctor_id}` | — | `DoctorProfileResponse` | Full doctor profile by `user_id` |
| `GET` | `/api/doctors/{doctor_id}/dashboard` | — | `DoctorDashboardResponse` | Aggregated home: stats, pending connection requests (patient-initiated, up to 3), recent patients, merged chat/prescription activity; **404** if doctor not found |
| `PUT` | `/api/doctors/{doctor_id}` | `DoctorProfileUpdate` (JSON) | `DoctorProfileResponse` | Update profile (409 if email taken by another user) |
| `GET` | `/api/doctors/dev/echo` | Header `X-Doctor-Id` | `{ doctor_id }` | Confirms doctor header present (400 if missing); tests / manual checks |
| `GET` | `/api/doctors/{doctor_id}/patients` | Query: `search`, `sort` (`recent` \| `name` \| `last_visit`), `skip`, `limit` | `DoctorPatientListResponse` | Active connections only; 404 if doctor not found |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/profile` | — | `PatientProfileResponse` | **403** if no active connection |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/medical-history` | — | `MedicalHistoryResponse` | Same aggregation as patient dashboard; **403** if not connected |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents` | Query: `category`, `page`, `page_size` | `DocumentListResponse` | **403** if not connected |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/documents/{document_id}` | — | Binary stream | Download/view; **403** if not connected |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/message` | `ChatRequest` (JSON) | `ChatResponse` | Doctor AI chat (non-streaming); **403** without active connection; session/messages store `doctor_id` |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/message/stream` | `ChatRequest` (JSON) | SSE (`text/event-stream`) | Same as above; connection checked before stream starts |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/sessions` | — | `ChatSessionSummary[]` | Chat sessions for this doctor–patient pair; **403** if not connected |
| `GET` | `/api/doctors/{doctor_id}/chat/sessions` | Query: optional `patient_id` | `ChatSessionSummary[]` | All chat sessions for this doctor; optional `patient_id` filter (connection required when filter set) |
| `GET` | `/api/doctors/{doctor_id}/chat/history/{chat_id}` | — | `ChatHistoryResponse` | **403** if session is legacy (no `doctor_id`) or belongs to another doctor; **404** if chat missing |
| `GET` | `/health` | — | `{ status: "ok" }` | Health check |

## Dev identity headers (Phase B + Phase C dev picker)

Until authentication (Phase E), the frontend sends identity via headers (see `frontend/src/api/client.ts`):

- **`X-Patient-Id`** — set from `PatientContext` when a patient id is available (existing Phase B behavior).
- **`X-Doctor-Id`** — set from `IdentityContext` when dev **role** is **doctor** and a doctor is selected (Phase C).

Legacy **`/api/chat/*`** message endpoints **require** `X-Patient-Id`. Doctor chat under **`/api/doctors/.../chat/...`** uses **`patient_id` in the path**; the frontend calls these with **`skipPatientHeader: true`** so a stale `X-Patient-Id` from the patient dev picker does not override the URL. **`X-Doctor-Id`** is still sent when the dev role is doctor (see `get_current_doctor_id` in `backend/app/api/dependencies.py` for echo/tests). Other routes may ignore unused headers.

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

### `ChatSessionSummary`

```python
class ChatSessionSummary(BaseModel):
    chat_id: str
    patient_id: str
    doctor_id: str | None = None
    created_at: datetime
    updated_at: datetime
```

### `PatientInfo`

```python
class PatientInfo(BaseModel):
    id: str    # e.g. "john_doe" — chat `patient_id` / markdown file stem
    name: str  # e.g. "John Doe"
    file: str  # e.g. "patient_john_doe.md"
    user_id: str | None = None  # UUID when row exists in `users`
```

### `DoctorInfo`

```python
class DoctorInfo(BaseModel):
    id: str                      # doctor `user_id` (UUID)
    name: str                    # e.g. "Dr. Sarah Chen"
    specialization: str = ""   # e.g. "Internal Medicine"
    institution: str | None = None
```

### `DoctorProfileResponse` (summary)

Full professional profile for a doctor (`users.doctor_profile` nested fields flattened in JSON). Key fields: `user_id`, `email`, `first_name`, `last_name`, `title`, `specialization`, `sub_specializations`, license/NPI, institution, `education[]`, `office_address`, `accepting_new_patients`, `bio`, `created_at`, `updated_at`. See `backend/app/schemas/doctor.py`.

### `DoctorDashboardResponse` (summary)

Doctor portal home payload: `doctor_id`, `doctor_name`, `specialization`, `institution`, `stats` (`connected_patients`, `pending_requests` = patient-initiated pendings, `total_prescriptions`), `pending_requests[]`, `recent_patients[]`, `recent_activity[]` (`type`: `chat` \| `prescription`, `timestamp`, `patient_id`, `patient_name`, `summary`). See `backend/app/schemas/doctor.py`.

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
