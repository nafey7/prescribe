# Frontend–Backend Collaboration

API contract, casing conventions, ownership boundaries, and streaming behavior between the React frontend and FastAPI backend.

## Frontend routes (patient + doctor portals)

Client-side routes (`react-router-dom`, `createBrowserRouter` in `frontend/src/router.tsx`). **`RootLayout`** wraps **`AuthProvider`**. Authenticated areas use **`ProtectedAppShell`** → **`RequireAuth`** → **`IdentityProvider`** + **`PatientProvider`** → role boundary (`useLayoutEffect` redirect) → **`Outlet`**. Route strings are centralized in **`frontend/src/router/paths.ts`**; ESLint **`no-restricted-syntax`** blocks raw `/patient`, `/doctor`, etc. outside `paths.ts` and `router.tsx`.

| Path | Layout | Purpose |
|------|--------|---------|
| `/` | `RootLayout` | Public landing (sign in / create account); `?auth=login` or `signup`, `?returnUrl=`, optional `?role=doctor` when `allow_doctor_self_signup` |
| `/login`, `/signup` | — | Redirect to `/?auth=…` (preserves query) |
| `/patient`, `/patient/profile`, `/patient/documents`, `/patient/doctors`, `/patient/chat`, `/patient/meal-plans`, `/patient/meal-plans/:shareId` | `PatientLayout` | Patient portal (dashboard, profile, documents, “my doctors”, AI chat, **shared meal plans** list/detail) |
| `/patient/profile/:userId` | `PatientLayout` | Legacy under `/patient`: syncs picker → `/patient/profile` |
| `/doctor`, `/doctor/...` | `DoctorLayout` | Doctor portal: profile, patients list/detail, documents, chat, prescriptions, connections |
| `/admin`, `/admin/*` | — | Reserved; **`Navigate replace`** to `/` until an admin portal exists |
| **Legacy (single-hop redirects)** | — | `/home` → `/patient`; `/profile` → `/patient/profile`; `/documents` → `/patient/documents`; `/dashboard` → `/patient`; `/public/chat` → `/patient/chat`; `/profile/:userId` (root-level) → sync picker then `/patient/profile` |

## API endpoints

### Authentication (`/api/auth`) — Phase D

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| `POST` | `/api/auth/signup` | `{ email, password, role?: "patient" \| "doctor" }` | Access + refresh tokens, `user` | Defaults to patient; doctor only when `ALLOW_DOCTOR_SELF_SIGNUP`; duplicate email **409**; doctor disallowed **422** |
| `POST` | `/api/auth/login` | `{ email, password }` | Tokens + `user` | **401** bad credentials; **403** inactive |
| `POST` | `/api/auth/refresh` | `{ refresh_token }` | New token pair | **401** invalid / expired / reuse (generic detail) |
| `POST` | `/api/auth/logout` | `{ refresh_token }` optional | — | **204**; revokes refresh family (idempotent) |
| `GET` | `/api/auth/me` | Header `Authorization: Bearer` | `MeResponse` | **401** without valid access token |

Protected routes expect **`Authorization: Bearer <access_token>`** when `AUTH_REQUIRED=true`. The frontend attaches this from `AuthContext` via `applyPrescribeHeaders` (`frontend/src/api/client.ts`); RTK Query `baseApi` and SSE `fetch` share the same helper and **401 → refresh → one retry** behavior.

### REST (patient + doctor)

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| `POST` | `/api/chat/message` | `ChatRequest` (JSON) + **`Authorization: Bearer`** (or legacy `X-Patient-Id` in dev bypass) | `ChatResponse` (JSON) | Non-streaming message; patient resolved from JWT when authenticated |
| `POST` | `/api/chat/message/stream` | `ChatRequest` (JSON) + Bearer (or legacy `X-Patient-Id` in dev bypass) | SSE stream | Same identity rules as non-streaming |
| `GET` | `/api/chat/history/{chat_id}` | Bearer + `X-Patient-Id` only in dev bypass | `ChatHistoryResponse` | **403** if session not owned by caller; **404** if missing |
| `GET` | `/api/chat/patients` | Bearer (patient: self list) or dev bypass | `PatientInfo[]` | Legacy alias; same data as `/api/patients/for-chat` for patients |
| `GET` | `/api/patients/for-chat` | Bearer or dev bypass | `PatientInfo[]` | Chat-oriented patient list for picker / portal |
| `POST` | `/api/patients` | `PatientProfileCreate` (JSON) | `PatientProfileResponse` (201) | Create patient profile (dev / migration; not end-user signup) |
| `GET` | `/api/patients` | Bearer (**patient**: self-only list) or dev bypass | `PatientListResponse` | Paginated patient profiles |
| `GET` | `/api/patients/{patient_id}` | Bearer (**patient**, own profile) or dev bypass | `PatientProfileResponse` | Get profile by `user_id` (UUID) or `patient_slug` |
| `GET` | `/api/patients/{patient_id}/medical-history` | Bearer (**patient**, own) or dev bypass | `MedicalHistoryResponse` | Aggregated dashboard: profile + parsed Markdown (`medications`, labs, timeline) + recent `documents` rows when present |
| `PUT` | `/api/patients/{patient_id}` | `PatientProfileUpdate` (JSON) + auth as above | `PatientProfileResponse` | Update profile (same id rules as GET) |
| `POST` | `/api/patients/{patient_id}/documents` | Multipart: `file`, `category`, `description` | `DocumentUploadResponse` (201) | Upload PDF/image to GridFS + `documents` metadata |
| `GET` | `/api/patients/{patient_id}/documents` | Query: `category`, `page`, `page_size` | `DocumentListResponse` | Paginated document list (optional category filter) |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}` | — | Binary stream | Download/view file (`Content-Type`, `Content-Disposition: inline`) |
| `GET` | `/api/patients/{patient_id}/documents/{document_id}/metadata` | — | `DocumentMetadata` | JSON metadata only |
| `PUT` | `/api/patients/{patient_id}/documents/{document_id}` | `DocumentUpdateRequest` (JSON) | `DocumentMetadata` | Update category, description, tags |
| `DELETE` | `/api/patients/{patient_id}/documents/{document_id}` | — | 204 | Delete GridFS file and metadata |
| `POST` | `/api/doctors` | `DoctorProfileCreate` (JSON) | `DoctorProfileResponse` (201) | Register doctor profile in `users` (`role: doctor`); 409 if email exists |
| `GET` | `/api/doctors` | Query: `skip`, `limit` | `DoctorListResponse` | Paginated doctor profiles |
| `GET` | `/api/doctors/for-dev` | Bearer or dev bypass | `DoctorInfo[]` | Doctor list for dev identity picker (`users` with `role: doctor`) |
| `GET` | `/api/doctors/{doctor_id}` | Bearer (**doctor**, path must match `sub`) or dev bypass | `DoctorProfileResponse` | Full doctor profile by `user_id` |
| `GET` | `/api/doctors/{doctor_id}/dashboard` | Bearer (**doctor**, self) or dev bypass | `DoctorDashboardResponse` | Aggregated home: stats, pending connection requests (patient-initiated, up to 3), recent patients, merged chat/prescription activity; **404** if doctor not found |
| `PUT` | `/api/doctors/{doctor_id}` | `DoctorProfileUpdate` (JSON) + auth as above | `DoctorProfileResponse` | Update profile (409 if email taken by another user) |
| `GET` | `/api/doctors/dev/echo` | Bearer (**doctor**) or legacy `X-Doctor-Id` in dev bypass | `{ doctor_id }` | Echoes resolved doctor id; tests / manual checks |
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
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/meal-plan/pdf` | Query: **`chat_id`**, **`message_id`** (required) | `application/pdf` (stream) | Doctor-only; **403** without active connection; **404** if message missing / wrong chat / not `meal_plan`. `Content-Disposition: attachment` with ASCII-safe `meal-plan-{message_id}.pdf` |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions` | `{ diagnosis_summary?, notes?, medications? }` | `PrescriptionRead` (201) | Create prescription; **403** if not connected |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions` | Query: `status` | `PrescriptionRead[]` | List prescriptions; **403** if not connected |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions/{prescription_id}` | — | `PrescriptionRead` | Get one prescription |
| `PATCH` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions/{prescription_id}` | `{ status }` | `PrescriptionRead` | Update prescription status |
| `DELETE` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions/{prescription_id}` | — | `PrescriptionRead` | Cancel prescription |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions/suggest` | `{ prompt }` | `PrescriptionSuggestionResponse` | AI copilot suggestion; **403** if not connected; **500** on LLM failure |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/prescriptions/check-interactions` | `DrugInteractionCheckRequest` (JSON) | `DrugInteractionCheckResponse` | AI drug interaction screen; **403** if not connected; **422** blank/missing medication name; **500** on LLM failure (returns generic error, not AI error) |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/meal-plan-shares` | `MealPlanShareCreate` — `{ chat_id, message_id }` | `MealPlanShareResponse` | Creates a **snapshot** in `meal_plan_shares` for the patient portal. **201** when inserted; **200** when an active share already exists for the same `(patient_id, source_message_id)` (idempotent). **403** / **404** same rules as PDF |
| `GET` | `/api/patients/{patient_id}/meal-plan-shares` | Query: `skip`, `limit` | `MealPlanShareListResponse` | Patient self (**JWT** `patient_id` must match path, or dev bypass). Active shares only (`revoked_at` null) |
| `GET` | `/api/patients/{patient_id}/meal-plan-shares/{share_id}` | — | `MealPlanShareResponse` | Full snapshot including `meal_plan`. **404** if revoked, wrong patient, or unknown `share_id` |
| `GET` | `/api/patients/{patient_id}/meal-plan-shares/{share_id}/pdf` | — | `application/pdf` (stream) | PDF rendered from stored snapshot (works even if source chat was deleted). Same attachment naming pattern using `share_id` |
| `GET` | `/api/config/features` | — | `{ ai_suggestions_enabled, auth_relaxed, allow_doctor_self_signup }` | Public config snapshot the frontend reads at boot (snake_case on the wire; camelCase in `FeatureFlagContext`) |
| `GET` | `/api/config/ai-provider` | Bearer (**doctor**) or dev bypass | `AIProviderResponse` | Read the active LLM provider and which API keys are configured |
| `POST` | `/api/config/ai-provider` | Bearer (**doctor**) or dev bypass; body `{ "provider": "openai" \| "gemini" }` | `AIProviderResponse` | Switch the active LLM provider at runtime; **400** if target provider's key is missing; **422** for unknown provider |
| `GET` | `/health` | — | `{ status: "ok" }` | Health check |

### `POST .../prescriptions/check-interactions`

Screens proposed medications against the patient's existing medications, allergies, and conditions. Returns AI-generated interaction warnings before the prescription is saved.

**Request (`snake_case`):**
```json
{
  "medications": [
    { "name": "Aspirin", "dosage": "81mg", "frequency": "once daily" }
  ]
}
```

**Response (`snake_case`):**
```json
{
  "interactions": [
    {
      "severity": "critical",
      "title": "Warfarin + Aspirin — bleeding risk",
      "description": "Concurrent use significantly increases bleeding risk. Monitor closely.",
      "implicated_drugs": ["Warfarin", "Aspirin"]
    }
  ],
  "checked_at": "2026-05-10T14:22:03Z"
}
```

- `severity`: `"critical"` | `"moderate"` | `"minor"`.
- Warnings are advisory only — the doctor decides whether to proceed.
- Frontend state: `checked_at` is not persisted to the prescription; it is display-only.
- React hook: `useCheckDrugInteractionsMutation` from `api/prescriptionsApi.ts`. TypeScript types: `DrugInteraction`, `DrugInteractionCheckResponse`, `DrugInteractionCheckRequest` in `types/doctor.ts`.
- snake_case throughout on the wire; TypeScript type field names mirror the wire format.

### `GET /api/config/features`

Public config snapshot the SPA reads at boot. Snake_case on the wire; `FeatureFlagContext` maps to camelCase (`aiSuggestionsEnabled`, `authRelaxed`, `allowDoctorSelfSignup`).

```json
{
  "ai_suggestions_enabled": true,
  "auth_relaxed": false,
  "allow_doctor_self_signup": false
}
```

- `ai_suggestions_enabled` — from `Settings.AI_SUGGESTIONS_ENABLED`; gates the AI document suggestions UI.
- `auth_relaxed` — mirrors backend `auth_bypass_allowed()`: `true` only when `AUTH_REQUIRED=false` **and** `ENVIRONMENT in {local, test}`; enables the dev identity picker and legacy `X-Patient-Id` / `X-Doctor-Id` headers without JWT.
- `allow_doctor_self_signup` — from `Settings.ALLOW_DOCTOR_SELF_SIGNUP`; when `false`, `POST /api/auth/signup` with `role: "doctor"` returns **422** and the landing page hides the Doctor signup tab.

### `GET /api/config/ai-provider` and `POST /api/config/ai-provider`

Operator-only endpoints (doctor JWT or dev bypass) for inspecting and switching the active LLM provider at runtime without a process restart. The in-process registry resets to the `LLM_PROVIDER` env-var default on restart.

```json
// GET 200 OK
{
  "provider": "openai",
  "available_providers": ["openai", "gemini"],
  "openai_key_present": true,
  "gemini_key_present": false
}

// POST body
{ "provider": "gemini" }
// POST 200 OK — same shape as GET
// POST 400 — target key missing: { "detail": "Cannot switch to 'gemini': GOOGLE_API_KEY is not configured." }
// POST 422 — unknown provider (Pydantic validation)
```

No frontend integration is planned; these are backend admin / operator endpoints.

## Dev identity headers (legacy; subordinate to JWT)

**Phase D:** When the user is logged in, **`Authorization: Bearer`** is the source of truth; **`X-Patient-Id` / `X-Doctor-Id` are not used for authorization** (and should not be sent for real authenticated traffic — see `applyPrescribeHeaders`).

**Dev bypass** applies only when `AUTH_REQUIRED=false` **and** `ENVIRONMENT` is `local` or `test`. Then the frontend may still send:

- **`X-Patient-Id`** — from `PatientContext` / dev picker for patient flows.
- **`X-Doctor-Id`** — from `IdentityContext` when the dev role is doctor.

Doctor chat under **`/api/doctors/.../chat/...`** uses **`patient_id` in the path**; the frontend may use **`skipPatientHeader: true`** so a stale `X-Patient-Id` does not override the URL. Resolver details live in `backend/app/api/dependencies.py` (`resolve_actor_user`, `resolve_doctor_echo_id`, etc.).

## Request/response shapes

### `ChatRequest` (backend Pydantic model)

```python
class ChatRequest(BaseModel):
    message: str       # 1–5000 chars
    chat_id: str | None = None
```

Patient context for chat is **not** in the JSON body. With JWT auth it is derived from the access token and patient profile; in dev bypass mode it comes from **`X-Patient-Id`** (see `resolve_patient_chat_patient_id` in `backend/app/api/dependencies.py`).

### `ChatResponse`

Non-streaming chat endpoints (`POST /api/chat/message`, `POST /api/doctors/{doctor_id}/patients/{patient_id}/chat/message`) return:

```python
class ChatResponse(BaseModel):
    message: str
    chat_id: str
    message_id: str
    chat_title: str | None = None
    message_type: str = "text"  # "text" | "meal_plan" (extensible)
    meal_plan: MealPlanPayload | None = None
```

- **`message_type`** — `"text"` for plain assistant replies; `"meal_plan"` when a structured meal plan was submitted and validated (see `MealPlanPayload` in `backend/app/schemas/meal_plan.py`).
- **`meal_plan`** — Omitted or `null` when there is no structured plan; when present, JSON is **snake_case** end-to-end (`num_days`, `days`, `summary`, `disclaimer`, nested `day_index`, `meals`, etc.).

### `MessageSchema` (history)

`GET /api/chat/history/{chat_id}` and `GET /api/doctors/{doctor_id}/chat/history/{chat_id}` return messages with the same optional structured fields:

```python
class MessageSchema(BaseModel):
    role: str
    content: str
    timestamp: datetime
    message_type: str = "text"
    meal_plan: MealPlanPayload | None = None
```

Legacy rows without `message_type` / `meal_plan` in MongoDB are treated as **`"text"`** / **`null`** when mapped to this schema.

### `ChatHistoryResponse`

```python
class ChatHistoryResponse(BaseModel):
    chat_id: str
    messages: list[MessageSchema]  # role, content, timestamp; optional message_type, meal_plan
```

### Meal plan shares (MongoDB + API)

Shared meal plans are stored in collection **`meal_plan_shares`**: `share_id` (UUID), `patient_id`, `doctor_id`, **`meal_plan`** (snapshot dict, same shape as chat `meal_plan`), `source_chat_id`, `source_message_id`, optional `chat_title`, `created_at`, optional `revoked_at`. Indexes cover patient list queries and idempotent create by `(patient_id, source_message_id)` for active rows. See `docs/plans/PLAN_MEAL_PLAN_PDF_AND_PATIENT_SHARE.md`.

```python
class MealPlanShareCreate(BaseModel):
    chat_id: str
    message_id: str


class MealPlanShareResponse(BaseModel):
    share_id: str
    patient_id: str
    doctor_id: str
    meal_plan: MealPlanPayload
    source_chat_id: str
    source_message_id: str
    chat_title: str | None = None
    doctor_display_name: str | None = None
    created_at: datetime
    revoked_at: datetime | None = None


class MealPlanShareListItem(BaseModel):
    share_id: str
    doctor_id: str
    doctor_display_name: str | None = None
    chat_title: str | None = None
    created_at: datetime
    summary_line: str | None = None


class MealPlanShareListResponse(BaseModel):
    items: list[MealPlanShareListItem]
    total: int
    skip: int
    limit: int
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
  chat_title?: string | null;
  message_type?: string;
  meal_plan?: MealPlanPayload | null;
}

// Mirrors backend/app/schemas/meal_plan.py — snake_case on the wire.
// See frontend/src/types/mealPlan.ts.

interface Patient {
  id: string;
  name: string;
  file: string;
  user_id?: string | null;
}
```

### `MedicalHistoryResponse` (summary)

Returned by `GET /api/patients/{patient_id}/medical-history`. JSON uses `snake_case` throughout (e.g. `lab_reports`, `medical_events`, `recent_documents`). Core fields: `patient_id` (UUID), `summary` (name, demographics), `conditions`, `allergies`, `medications`, `family_history`, `lifestyle` (all from the patient's `patient_profile` in MongoDB), `recent_documents` (from the `documents` collection), and `lab_reports` / `medical_events` (reserved for future DB-backed timelines; currently returned as empty arrays).

## Casing conventions

| Boundary | Convention | Example |
|----------|-----------|---------|
| Backend Python code | `snake_case` | `patient_id`, `chat_id` |
| API JSON payloads | `snake_case` | `{ "chat_id": "..." }` (chat body); `patient_id` via path or resolved from JWT / dev header, not in `ChatRequest` |
| Frontend TypeScript interfaces | `snake_case` (mirrors backend) | `ChatResponse.chat_id` |
| Frontend internal state | `camelCase` | `chatId`, `patientId`, `isLoading` |

The frontend API modules send `snake_case` in JSON bodies where applicable, attach **`Authorization: Bearer`** when authenticated (and dev headers only in bypass mode), and receive `snake_case` in responses. The `useChat` hook maps to `camelCase` for internal React state.

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
data: {"chat_id": "abc-123", "message_id": "msg-456", "message_type": "text"}

event: done
data: {"chat_id": "abc-123", "message_id": "msg-456", "message_type": "meal_plan", "meal_plan": {"num_days": 1, "days": [{"day_index": 1, "meals": [{"name": "Oatmeal", "description": "", "items": []}]}], "summary": "Example", "disclaimer": "…"}}

event: error
data: {"detail": "LLM timeout"}
```

**`done` event (streaming completion):** JSON includes at least `chat_id` and `message_id`. **`message_type`** defaults to `"text"` if omitted. **`meal_plan`** is included only when non-null (assistant turn with validated structured plan). Doctor chat streaming uses the same SSE format via `sendDoctorChatMessageStream()` in `frontend/src/api/chatStream.ts`, which parses `message_type` and `meal_plan` on `onDone`.

### Frontend SSE parsing

`sendMessageStream()` and `sendDoctorChatMessageStream()` live in `frontend/src/api/chatStream.ts` (re-exported from `api/chat.ts` for patient). Both use:
- Shared `fetch` from `api/client.ts` (`POST`, not `EventSource`, which only supports GET) so **`Authorization: Bearer`** and dev headers are attached the same way as other API calls
- `response.body.getReader()` + `TextDecoder` for chunk reading
- Manual SSE line parsing (`event:` / `data:` lines), including **`done`** → `message_type` and optional **`meal_plan`**
- Callback dispatch to `onThinking`, `onToken`, `onDone`, `onError` (and optional `onChatTitle` for `event: title`)

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
| SSE parsing | Frontend (`api/chatStream.ts`) | Stream reading, JSON parsing, `done` metadata |
| Meal plan PDF + shares | Backend (`service/meal_plan_pdf.py`, `service/meal_plan_share.py`, `repository/meal_plan_share.py`) | Server-side PDF bytes; share snapshots independent of chat deletion |
| Patient meal plan UI | Frontend (`PatientMealPlansPage.tsx`, `PatientMealPlanDetailPage.tsx`; RTK `patientsApi` + `chatApi`) | List/detail; PDF via `/api/patients/.../meal-plan-shares/{share_id}/pdf` |
| State management | Frontend (`useChat` hook) | Messages, loading, errors |
| Markdown rendering | Frontend (`ChatMessage` component) | react-markdown + remark-gfm |
| Streaming UX | Frontend (components) | Thinking indicator, cursor, RAF buffering |

## Error handling

| Scenario | Backend behavior | Frontend behavior |
|----------|-----------------|-------------------|
| Missing / invalid JWT on protected route | 401 `Authentication required` / `Invalid or expired token` | Silent refresh + retry; redirect `/login?returnUrl=…` if refresh fails |
| Cross-tenant or wrong role | 403 | Error surfaced per route / RTK handler |
| Invalid request | 422 Validation Error | API client throws, error shown in UI |
| AI service failure (non-streaming) | 503 with `detail` | Error message in chat bubble |
| AI error mid-stream | `error` SSE event | `onError` callback → error in chat bubble |
| Network failure | — | `catch` in `useChat` → error in chat bubble |
| Empty AI response | Fallback message sent | Displayed as normal message |
