# Feature 7: Doctor AI Chat

Migrates the existing AI chat from a public prototype to a **doctor-only** feature, scoped to connected patients. Per [`PRODUCT.md`](../../PRODUCT.md), the AI assistant is exclusively for doctors — patients do not interact with the AI. Doctors select a connected patient, then chat with the AI to get summaries, ask health-related questions, and navigate large medical records.

**Parent:** [`MASTER_PLAN.md`](./MASTER_PLAN.md) · **Build order:** 7th (after Doctor Dashboard; depends on connections for access control)

**Auth:** Chat APIs use dev-time `X-Doctor-Id` header for identity — **no JWT** in this plan (Phase E per [`PLAN_PRODUCT_BUILD_ORDER.md`](../PLAN_PRODUCT_BUILD_ORDER.md)).

---

## Problem

Today, the AI chat at `/public/chat` is a prototype with no access control:
- Anyone can chat about any patient
- `patient_id` comes from a dev header with no authorization check
- Chat sessions are not attributed to a doctor
- No connection-based access gating

Phase C needs to:

1. Move AI chat under the doctor portal at `/doctor/patients/:patientId/chat`
2. Enforce that only connected doctors can chat about a patient
3. Attribute chat sessions to both a doctor and a patient
4. Retire or redirect the `/public/chat` route
5. Update the LangGraph agent context to include doctor identity
6. Preserve all existing streaming, persistence, and rendering infrastructure

---

## Design

### Chat URL and entry point

**New canonical path:** `/doctor/patients/:patientId/chat`

The doctor navigates to a connected patient's detail view, then clicks the **"Chat"** tab or a **"Chat with AI"** button. The patient context is already set by the URL — no patient selector needed within the chat page.

**Retired path:** `/public/chat` redirects to `/doctor` (already configured in the UI shell plan). The standalone public chat concept is replaced by the doctor-scoped chat.

### Chat experience (largely unchanged)

The core chat UX remains the same as the prototype:
- Message input at the bottom
- Message list with Markdown rendering
- Streaming responses with thinking indicators
- Chat history sidebar (scoped to this doctor + patient)

What changes:
- **No patient selector** in the chat page — patient comes from the URL
- **Doctor attribution** — sessions and messages are tagged with `doctor_id`
- **Connection check** — the backend verifies the doctor is connected to the patient before processing any message
- **Chat history** shows only this doctor's sessions with this specific patient
- **System prompt** is updated to include doctor context

### Session model changes

```
Before (prototype):                    After (Phase C):
┌─────────────────────┐               ┌─────────────────────────────┐
│ chat_session        │               │ chat_session                │
│   chat_id           │               │   chat_id                   │
│   patient_id        │               │   patient_id                │
│   created_at        │               │   doctor_id (NEW)           │
│   updated_at        │               │   created_at                │
└─────────────────────┘               │   updated_at                │
                                      └─────────────────────────────┘
```

`doctor_id` is added to `chat_sessions` and `chat_messages`. Existing prototype sessions (without `doctor_id`) remain accessible but are considered legacy.

---

## Backend

### API routes (`backend/app/api/doctor_chat.py`)

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/message` | `send_message` | Non-streaming; connection-gated |
| `POST` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/message/stream` | `send_message_stream` | SSE streaming; connection-gated |
| `GET` | `/api/doctors/{doctor_id}/patients/{patient_id}/chat/sessions` | `list_sessions` | Chat sessions for this doctor-patient pair |
| `GET` | `/api/doctors/{doctor_id}/chat/sessions` | `list_all_sessions` | All sessions for this doctor (across patients) |
| `GET` | `/api/doctors/{doctor_id}/chat/history/{chat_id}` | `get_history` | Chat history; validates doctor owns the session |

#### Request/response shapes

Chat request body is identical to existing prototype:

```python
class ChatRequest(BaseModel):
    message: str  # 1–5000 chars
    chat_id: str | None = None
```

The `doctor_id` and `patient_id` come from path parameters (validated by `verify_connection`), not the request body.

Chat response is unchanged:

```python
class ChatResponse(BaseModel):
    message: str
    chat_id: str
    message_id: str
```

### Service (`backend/app/service/doctor_chat.py`)

The service wraps the existing chat service with connection checks and doctor attribution:

```python
async def process_doctor_message(
    db, doctor_id: str, patient_id: str, request: ChatRequest
) -> ChatResponse:
    await verify_connection(db, doctor_id, patient_id)

    # Delegate to existing chat processing with doctor context
    return await chat_service.process_message(
        db,
        patient_id=patient_id,
        message=request.message,
        chat_id=request.chat_id,
        doctor_id=doctor_id,  # NEW: passed to session/message creation
    )

async def process_doctor_message_stream(
    db, doctor_id: str, patient_id: str, request: ChatRequest
):
    await verify_connection(db, doctor_id, patient_id)

    async for event in chat_service.process_message_stream(
        db,
        patient_id=patient_id,
        message=request.message,
        chat_id=request.chat_id,
        doctor_id=doctor_id,
    ):
        yield event

async def list_doctor_patient_sessions(
    db, doctor_id: str, patient_id: str
) -> list[ChatSessionSummary]:
    await verify_connection(db, doctor_id, patient_id)
    return await chat_repo.list_sessions(db, doctor_id=doctor_id, patient_id=patient_id)

async def list_doctor_all_sessions(
    db, doctor_id: str
) -> list[ChatSessionSummary]:
    return await chat_repo.list_sessions(db, doctor_id=doctor_id)
```

### Existing service changes (`backend/app/service/chat.py`)

The existing `process_message` and `process_message_stream` are updated to accept an **optional** `doctor_id` parameter:

```python
async def process_message(
    db, patient_id: str, message: str,
    chat_id: str | None = None,
    doctor_id: str | None = None,  # NEW
) -> ChatResponse:
    # Create/get session — now includes doctor_id if provided
    session = await get_or_create_session(db, patient_id, chat_id, doctor_id)
    # Save user message with doctor_id
    # Invoke AI agent (unchanged logic)
    # Save assistant message with doctor_id
    ...
```

This is backward-compatible — if `doctor_id` is `None`, behavior matches the prototype. Prototype chat endpoints can be deprecated or kept for backward compatibility.

### Repository changes (`backend/app/repository/chat.py`)

| Change | Description |
|--------|-------------|
| `create_session` | Accept optional `doctor_id`, store in session doc |
| `save_message` | Accept optional `doctor_id`, store in message doc |
| `list_sessions` | Accept optional `doctor_id` and `patient_id` filters |
| `get_session` | Return includes `doctor_id` field |

### New index

```javascript
db.chat_sessions.createIndex({ doctor_id: 1, patient_id: 1, updated_at: -1 });
```

### AI agent updates (`backend/app/ai/graph.py`)

The system prompt is enhanced to include doctor context:

```python
DOCTOR_SYSTEM_PROMPT = """You are a medical AI assistant helping {doctor_name}, 
a {specialization} at {institution}, review and analyze the medical records 
of patient {patient_name}.

You have access to the patient's medical history, lab results, medications, 
and uploaded documents. Provide evidence-based summaries and insights to help 
the doctor make informed clinical decisions.

Important:
- Base all responses on actual patient record content
- Do not fabricate medical data
- Flag any concerning trends or interactions
- This is an educational prototype, not a clinical decision support system
"""
```

The `MedicalChatState` gains an optional `doctor_id` field for potential future use in tool scoping.

### Prototype endpoint deprecation

The existing chat endpoints (`POST /api/chat/message`, `POST /api/chat/message/stream`) are **kept** for backward compatibility during the transition but marked as deprecated. They continue to work without doctor context. In Phase E (auth), these can be removed or locked to authenticated doctors only.

---

## Frontend

### Chat page (`frontend/src/pages/doctor/DoctorChatPage.tsx`)

Route: `/doctor/patients/:patientId/chat`

The page reuses the existing chat components with modifications:

```
┌─────────────────────────────────────────────────────────┐
│  PatientContextBar: ← Back | John Doe | [Profile] ...   │
├───────────┬─────────────────────────────────────────────┤
│           │                                              │
│  Chat     │   AI Medical Assistant                       │
│  History  │   Patient: John Doe                          │
│           │                                              │
│  Session 1│   ┌──────────────────────────────────┐      │
│  Mar 10   │   │ 👤 What are the patient's current │      │
│           │   │    medications and any potential   │      │
│  Session 2│   │    interactions?                   │      │
│  Mar 5    │   └──────────────────────────────────┘      │
│           │   ┌──────────────────────────────────┐      │
│  Session 3│   │ 🤖 Based on the patient records, │      │
│  Feb 28   │   │    John Doe is currently taking:  │      │
│           │   │    - Lisinopril 20mg daily AM...  │      │
│           │   └──────────────────────────────────┘      │
│           │                                              │
│  [+ New]  │   ┌──────────────────────────────────┐      │
│           │   │  Ask about this patient...    [→] │      │
│           │   └──────────────────────────────────┘      │
├───────────┴─────────────────────────────────────────────┤
│  ⚠ Educational prototype — not medical advice           │
└─────────────────────────────────────────────────────────┘
```

**Key differences from prototype chat:**
- No patient selector (patient from URL params)
- Chat history sidebar shows only sessions for this doctor + patient
- "New Chat" creates a session attributed to the current doctor
- Patient context bar above (from DoctorLayout)
- No `DevIdentityBanner` patient switching on this page

### Components (reused and new)

| Component | Status | Purpose |
|-----------|--------|---------|
| `DoctorChatPage` | **New** | Page wrapper; reads `patientId` from URL |
| `ChatSessionSidebar` | **New** | Session history for this doctor-patient pair |
| `ChatMessageList` | **Reused** | Renders messages with Markdown (existing) |
| `ChatInput` | **Reused** | Message input with send button (existing) |
| `ChatMessage` | **Reused** | Individual message bubble (existing) |
| `ThinkingIndicator` | **Reused** | Streaming thinking state (existing) |

### Hook: `useDoctorChat`

A new hook that wraps the existing `useChat` logic with doctor-scoped API calls:

```typescript
export function useDoctorChat(doctorId: string, patientId: string) {
  // Similar to useChat but uses doctor-scoped endpoints
  // POST /api/doctors/{doctorId}/patients/{patientId}/chat/message/stream
  // GET /api/doctors/{doctorId}/patients/{patientId}/chat/sessions
  // GET /api/doctors/{doctorId}/chat/history/{chatId}
}
```

### API client additions (`frontend/src/api/doctors.ts`)

```typescript
export async function sendDoctorChatMessage(
  doctorId: string,
  patientId: string,
  message: string,
  chatId?: string
): Promise<ChatResponse> { ... }

export function sendDoctorChatMessageStream(
  doctorId: string,
  patientId: string,
  message: string,
  chatId?: string,
  callbacks: StreamCallbacks
): Promise<void> { ... }

export async function getDoctorChatSessions(
  doctorId: string,
  patientId: string
): Promise<ChatSessionSummary[]> { ... }

export async function getDoctorChatHistory(
  doctorId: string,
  chatId: string
): Promise<ChatHistoryResponse> { ... }
```

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `backend/app/service/doctor_chat.py` | Connection-gated chat service |
| `backend/app/api/doctor_chat.py` | Doctor chat API routes |
| `frontend/src/pages/doctor/DoctorChatPage.tsx` | Doctor chat page (replaces placeholder) |
| `frontend/src/components/doctor/chat/ChatSessionSidebar.tsx` | Session history sidebar |
| `frontend/src/hooks/useDoctorChat.ts` | Doctor-scoped chat hook |

### Modified files

| File | Change |
|------|--------|
| `backend/app/service/chat.py` | Add optional `doctor_id` parameter to `process_message` and `process_message_stream` |
| `backend/app/repository/chat.py` | Add `doctor_id` to session/message creation and filtering |
| `backend/app/schemas/chat.py` | Add `ChatSessionSummary` schema; add `doctor_id` to session schema |
| `backend/app/ai/graph.py` | Update system prompt with doctor context |
| `backend/app/api/router.py` | Mount doctor chat routes |
| `init-mongo.js` | Add `doctor_id` + `patient_id` index on `chat_sessions` |
| `frontend/src/api/doctors.ts` | Add chat API functions |
| `frontend/src/types/doctor.ts` | Add chat-related types |

---

## Implementation steps

1. **Update `chat_sessions` and `chat_messages`** to support `doctor_id` field
2. **Update `repository/chat.py`** — session/message creation includes `doctor_id`; add session listing with filters
3. **Update `service/chat.py`** — accept optional `doctor_id` parameter
4. **Create `service/doctor_chat.py`** with connection-gated wrappers
5. **Create `api/doctor_chat.py`** routes and mount in router
6. **Update AI system prompt** in `ai/graph.py` for doctor context
7. **Add chat session index** to `init-mongo.js`
8. **Create `ChatSessionSidebar` component** for session history
9. **Create `useDoctorChat` hook** with doctor-scoped API calls
10. **Build `DoctorChatPage`** combining sidebar, message list, input
11. **Test full chat flow** — send message, streaming, session history
12. **Test connection gating** — verify 403 for non-connected doctor-patient pair
13. **Verify prototype chat still works** (backward compatibility) during transition

---

## Testing

| Test | Type | Validates |
|------|------|-----------|
| Send message when connected | API | 200, response returned, session created with `doctor_id` |
| Send message when NOT connected | API | 403 forbidden |
| Stream message when connected | API | SSE events received |
| Stream message when NOT connected | API | 403 forbidden |
| List sessions for doctor-patient pair | API | Only sessions with matching `doctor_id` + `patient_id` |
| Get session history validates doctor ownership | API | 403 if doctor doesn't own the session |
| Chat renders with streaming | Frontend | Tokens stream, thinking indicator shows |
| Session sidebar shows history | Frontend | Previous sessions listed |
| Switch session loads history | Frontend | Messages from selected session displayed |
| New chat button creates fresh session | Frontend | Empty message list, new `chat_id` |
| Patient context shown in header | Frontend | Patient name and demographics visible |
| Prototype chat endpoints still work | API (regression) | No breaking changes to existing `/api/chat/*` |

---

## Migration notes

### Existing chat data

Prototype chat sessions don't have `doctor_id`. Options:
1. **Leave as-is** — legacy sessions are accessible only through deprecated endpoints
2. **Backfill** — if seed doctors exist, attribute old sessions to a seed doctor via a migration script

Recommendation: Option 1 (leave as-is) for simplicity. New doctor-scoped sessions will have `doctor_id` from creation.

### `/public/chat` deprecation

The `/public/chat` route redirects to `/doctor` per the UI shell plan. Users who had bookmarked it will land on the doctor dashboard. If the dev identity is set to "patient" role, they'll need to switch to "doctor" to access AI chat.

---

*Created: 2026-04-12*
