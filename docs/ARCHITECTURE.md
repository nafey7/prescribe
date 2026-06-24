# Architecture

System design and data flow for `prescribe-v2`. This is the canonical reference for how the pieces fit together.

## System overview

```
┌──────────────────────────────────────────────┐
│  Browser — React + Vite (port 5173)          │
│  AuthProvider → applyPrescribeHeaders        │
│  ChatPage → MessageList + ChatInput          │
└───────────────────┬──────────────────────────┘
                    │ Authorization: Bearer (Phase D)
                    │ POST /api/chat/message/stream (SSE)
                    │ POST /api/chat/message (JSON)
                    ▼
┌──────────────────────────────────────────────┐
│  FastAPI (port 8000)                         │
│  dependencies: decode JWT → CurrentUser      │
│  api/chat.py → service/chat.py → ai/graph.py│
│       │                │                     │
│       ▼                ▼                     │
│    MongoDB        Patient docs (data/*.md)   │
└──────────────────────────────────────────────┘
```

Three Docker Compose services: `frontend`, `backend`, `mongodb`.

## Request flow (non-streaming)

1. User sends a message via the chat UI
2. Frontend `POST /api/chat/message` with JSON `{ message, chat_id? }`. **`Authorization: Bearer <access>`** is attached for authenticated patients (via `applyPrescribeHeaders` in `frontend/src/api/client.ts`). By default **`AUTH_REQUIRED=true`**. Only when `AUTH_REQUIRED=false` in `local`/`test`, **`X-Patient-Id`** may still be used as a legacy dev identity (no JWT).
3. FastAPI `dependencies.resolve_actor_user` / `resolve_patient_chat_patient_id` decode and validate the access JWT (signature, `exp`, `iss`, `typ`, `tv` vs `users.token_version`), map the patient principal to the chat `patient_id`, and return **401/403** on failure or tenant mismatch.
4. `api/chat.py` validates the request via `ChatRequest` Pydantic model
5. `service/chat.py` `process_message()`:
   - Creates a server-generated UUID `chat_id`, or validates that a supplied ID already exists
   - Saves the user message as `pending` via `repository/chat.py`
   - Invokes `ai/graph.py` `invoke_medical_agent()` with the message, patient ID, and chat ID
6. LangGraph agent loop runs (see below)
7. AI response is saved to MongoDB and the user turn becomes `completed`; failures are marked `failed`
8. Returns `ChatResponse { message, chat_id, message_id }`
9. Frontend renders the response with Markdown formatting

## Request flow (streaming)

1. Frontend `POST /api/chat/message/stream` with the same JSON body and the same auth headers as non-streaming (Bearer when logged in; legacy `X-Patient-Id` only in dev bypass mode).
2. Returns `text/event-stream` (SSE)
3. `service/chat.py` `process_message_stream()`:
   - Same session/message setup as non-streaming
   - Yields SSE events from `ai/graph.py` `stream_medical_agent()`
   - After stream completes, persists the full response to MongoDB
   - Yields a final `done` event with `chat_id` and `message_id`
4. Frontend parses SSE events via `ReadableStream` reader

### SSE event types

| Event | Data shape | When |
|-------|-----------|------|
| `thinking` | `{ status: string, phase?: string }` | Tool starts/ends, initial "Thinking..." (phases include `differential` when the differential tool is invoked) |
| `token` | `{ content: string }` | Each text chunk from the LLM |
| `differential_diagnosis` | `{ differential_diagnosis: DifferentialDiagnosisPayload }` | After the LLM calls `submit_differential_diagnosis` and the payload validates. Parallel to the meal-plan / fitness-plan `done`-bundled payloads, but emitted as a discrete event so the card can render before `done`. |
| `done` | `{ chat_id, message_id, message_type, citations, meal_plan?, fitness_plan?, differential_diagnosis? }` | Stream complete, message and its resolved citation sources persisted |
| `error` | `{ detail: string }` | Unrecoverable error mid-stream |

## LangGraph agent flow

```
START
  ↓
agent node (LLM with tools bound)
  ↓
_should_continue?
  ├─ tool_calls present → tools node (ToolNode executes tool)
  │                          ↓
  │                        agent node (loop back)
  └─ no tool_calls → compact memory → END
```

- **Graph type:** `StateGraph` with `MedicalChatState` (messages list + patient_id)
- **Checkpointing:** MongoDB via `langgraph-checkpoint-mongodb`, keyed by `thread_id` = `chat_id`. Chat deletion removes this checkpoint before deleting public session/message records. A missing client-supplied `chat_id` is never recreated.
- **Patient scope:** `patient_id` is injected from graph state with `InjectedState`; it is absent from model-visible tool schemas and overrides any model-supplied value.
- **Memory bound:** model/checkpoint messages are trimmed to `CHAT_CONTEXT_MAX_TOKENS`; `chat_messages` remains the authoritative complete history.
- **Turn serialization:** an atomic MongoDB lease permits one active graph run per `chat_id`; overlapping requests receive `409`, and stale leases expire after three minutes.
- **Tools:** Registered in `TOOLS` list in `ai/graph.py`:

| Tool | Purpose |
|------|---------|
| `search_patient_records` | Reads patient profile (conditions, medications, allergies, demographics) from `users` collection |
| `fetch_lab_results` | Reads structured lab values from `suggestions` collection (`category="lab_result"`) for a given patient and optional document ID |
| `search_patient_documents` | Reads bounded text extracted from the authorized patient's uploaded PDFs/images; document contents are explicitly treated as untrusted data |
| `web_search` | DuckDuckGo search for time-sensitive or general medical knowledge; obvious patient identifiers are blocked before outbound requests |
| `submit_meal_plan` | Emits a structured meal plan payload for the frontend renderer |
| `submit_fitness_plan` | Emits a structured fitness plan payload for the frontend renderer |
| `submit_differential_diagnosis` | Emits a ranked, patient-grounded differential (per-diagnosis rationale + supporting/contradicting chart evidence, red flags, recommended workup) for the doctor-portal renderer |

## Doctor workflow AI

Standalone structured-output AI functions run outside the main chat graph:

| Module | Purpose | Called by |
|--------|---------|-----------|
| `ai/prescription_copilot_graph.py` | Structured-output suggestion from doctor's free-text prompt | `service/prescription_copilot.py` → `POST .../prescriptions/suggest` |
| `ai/drug_interaction_graph.py` | Screens proposed medications for drug-drug, drug-allergy, and drug-condition interactions | `service/drug_interaction_service.py` → `POST .../prescriptions/check-interactions` |
| `ai/pre_visit_brief.py` | Concise recent-document, prescription-activity, abnormal-lab, and unresolved-concern brief | `service/pre_visit_brief.py` → `POST .../pre-visit-brief` |

These functions use `with_structured_output()` against Pydantic models and wrap the sync LLM call in `asyncio.to_thread`. The drug interaction graph and pre-visit brief use `get_llm_deterministic()` (temperature=0.0). An unavailable interaction screen is never returned as an empty/safe result; brief generation returns a sanitized 503. A brief with no recent evidence is produced deterministically without an LLM call.
- **LLM:** Configurable via `LLM_PROVIDER` env var (`"openai"` default, or `"gemini"`). At runtime the active provider is held in `ai/provider.py` (`ProviderRegistry` singleton, thread-safe) and can be switched without a restart via `POST /api/config/ai-provider` (doctor-auth-gated). `get_llm()` and `get_title_llm()` both read from the registry; the env var is only the startup default.
- **System prompt:** Injected as `SystemMessage` at the start of the model context. Patient-facing names may be included, but internal patient identifiers are not exposed as tool arguments.

## Persistence model

**MongoDB collections:**

| Collection | Purpose | Key fields |
|------------|---------|-----------|
| `users` | Accounts | `user_id`, `email`, `role`, `password_hash`, `token_version`, … |
| `refresh_tokens` | Rotating refresh JWT ledger | `jti`, `user_id`, `family_id`, `expires_at`, `revoked_at`, … |
| `chat_sessions` | One doc per conversation | `chat_id`, `patient_id`, `created_at`, `updated_at` |
| `chat_messages` | One doc per message | `message_id`, `chat_id`, `patient_id`, `role`, `content`, `timestamp`, assistant `citations[]` |
| `clinical_notes` | Doctor-authored, patient-visible notes | `note_id`, `patient_id`, `doctor_id`, `note_type`, `title`, `content`, `encounter_date`, `published_at`, `updated_at` |
| `clinical_note_corrections` | Auditable patient correction requests | `correction_id`, `note_id`, `patient_id`, `doctor_id`, `comment`, `status`, resolution fields |
| `checkpoints` (LangGraph) | Graph state checkpoints | Managed by `MongoDBSaver` |
| `checkpoint_writes` (LangGraph) | Checkpoint write log | Managed by `MongoDBSaver` |

Messages are written in order: the user message is saved with `status=pending`, the assistant is saved after completion, and the user status becomes `completed`. Model failures and disconnected streams mark it `failed` or `cancelled`. History reads return the newest 50 messages in chronological display order.

Shared clinical-note generation is deliberately outside the chat graph. A connected doctor supplies encounter context; a deterministic structured-output LLM combines it with a bounded patient-profile summary and returns an editable `ClinicalNoteDraft`. Only the doctor's subsequent publish request writes `clinical_notes`. Patient correction requests are separate records with a partial unique index enforcing one open request per patient/note; author resolution preserves the request and response for audit.

### Source-linked answers

Patient-record tools include exact markdown citation handles beside each profile section, uploaded document, and lab report. The system prompt requires the model to place those handles immediately after every supported factual claim. After generation, `service/citations.py` extracts handles from the answer, resolves them against the current patient, discards unknown or cross-patient document references, and persists a structured `CitationSource[]` on the assistant message.

The frontend renders the inline handle and a Sources row. Profile sources navigate to the matching record section; document and lab sources are fetched through the existing authenticated patient or connected-doctor download endpoint before opening. Legacy messages without citations deserialize as an empty list.

## Patient data integration

Patient records live entirely in MongoDB. The `search_patient_records` tool:

1. Receives the authorized `patient_id` from LangGraph runtime state, not from model-generated arguments
2. Resolves it against the `users` collection (`role: patient`) via `user_id` or `patient_slug`
3. Formats the `patient_profile` (demographics, conditions, medications, allergies, family history, lifestyle) plus the five most recent entries from the `documents` collection into a structured text summary with exact citation handles
4. Returns a "no record found" message if neither lookup hits

No filesystem dependency, no restart required to pick up new or edited patients — it's a live read every turn.

New PDF/image uploads also run text extraction off the event loop and store a bounded `extracted_text` field. `search_patient_documents` retrieves up to three relevant recent documents. Older uploads without extracted text remain available as files but must be re-uploaded or backfilled before the agent can read their contents.

### Pre-visit brief evidence flow

The doctor patient-detail view can request an on-demand brief for an actively connected patient. `service/pre_visit_brief.py` resolves the path ID to the canonical patient `user_id`, verifies the connection, and builds a 180-day evidence packet from `documents`, `prescriptions`, and non-rejected `suggestions`, with `users.patient_profile` supplied only as baseline context. Inputs and extracted text are bounded before the deterministic structured-output call. The generated prose is not persisted, so regeneration always reflects current source records and does not create a stale clinical-summary lifecycle. Patient self-service chat history is not part of this evidence flow.

## Key dependencies

| Layer | Key packages |
|-------|-------------|
| Backend web | FastAPI, Uvicorn, Pydantic, pydantic-settings |
| Backend auth | PyJWT, passlib/bcrypt (Phase D) |
| Backend DB | Motor (async MongoDB), PyMongo |
| Backend AI | LangGraph, LangChain, langchain-google-genai, langchain-openai |
| Frontend UI | React 18, Vite 6, TypeScript 5, MUI + Emotion (`frontend/src/theme/`) |
| Frontend rendering | react-markdown, remark-gfm (theme-aware markdown in `frontend/src/ui/Markdown.tsx`) |
| Orchestration | Docker Compose, MongoDB 7.0 |
