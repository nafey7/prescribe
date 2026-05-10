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
   - Creates or retrieves the chat session (UUID-based `chat_id`)
   - Saves the user message to MongoDB via `repository/chat.py`
   - Invokes `ai/graph.py` `invoke_medical_agent()` with the message, patient ID, and chat ID
6. LangGraph agent loop runs (see below)
7. AI response is saved to MongoDB
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
| `thinking` | `{ status: string }` | Tool starts/ends, initial "Thinking..." |
| `token` | `{ content: string }` | Each text chunk from the LLM |
| `done` | `{ chat_id, message_id }` | Stream complete, message persisted |
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
  └─ no tool_calls → END
```

- **Graph type:** `StateGraph` with `MedicalChatState` (messages list + patient_id)
- **Checkpointing:** MongoDB via `langgraph-checkpoint-mongodb`, keyed by `thread_id` = `chat_id`
- **Tools:** Registered in `TOOLS` list in `ai/graph.py`:

| Tool | Purpose |
|------|---------|
| `search_patient_records` | Reads patient profile (conditions, medications, allergies, demographics) from `users` collection |
| `fetch_lab_results` | Reads structured lab values from `suggestions` collection (`category="lab_result"`) for a given patient and optional document ID |
| `web_search` | DuckDuckGo search for time-sensitive or general medical knowledge |
| `submit_meal_plan` | Emits a structured meal plan payload for the frontend renderer |
| `submit_fitness_plan` | Emits a structured fitness plan payload for the frontend renderer |

## Prescription AI graphs

Two standalone LangGraph-style AI functions run outside the main chat graph:

| Module | Purpose | Called by |
|--------|---------|-----------|
| `ai/prescription_copilot_graph.py` | Structured-output suggestion from doctor's free-text prompt | `service/prescription_copilot.py` → `POST .../prescriptions/suggest` |
| `ai/drug_interaction_graph.py` | Screens proposed medications for drug-drug, drug-allergy, and drug-condition interactions | `service/drug_interaction_service.py` → `POST .../prescriptions/check-interactions` |

Both use `with_structured_output()` against Pydantic models and wrap the sync LLM call in `asyncio.to_thread`. The drug interaction graph uses `get_llm_deterministic()` (temperature=0.0) for deterministic safety screening.
- **LLM:** Configurable via `LLM_PROVIDER` env var (`"openai"` default, or `"gemini"`). At runtime the active provider is held in `ai/provider.py` (`ProviderRegistry` singleton, thread-safe) and can be switched without a restart via `POST /api/config/ai-provider` (doctor-auth-gated). `get_llm()` and `get_title_llm()` both read from the registry; the env var is only the startup default.
- **System prompt:** Injected as `SystemMessage` at the start of the message list, templated with `patient_id`

## Persistence model

**MongoDB collections:**

| Collection | Purpose | Key fields |
|------------|---------|-----------|
| `users` | Accounts | `user_id`, `email`, `role`, `password_hash`, `token_version`, … |
| `refresh_tokens` | Rotating refresh JWT ledger | `jti`, `user_id`, `family_id`, `expires_at`, `revoked_at`, … |
| `chat_sessions` | One doc per conversation | `chat_id`, `patient_id`, `created_at`, `updated_at` |
| `chat_messages` | One doc per message | `message_id`, `chat_id`, `patient_id`, `role`, `content`, `timestamp` |
| `checkpoints` (LangGraph) | Graph state checkpoints | Managed by `MongoDBSaver` |
| `checkpoint_writes` (LangGraph) | Checkpoint write log | Managed by `MongoDBSaver` |

Messages are written in order: user message saved before AI invocation, assistant message saved after completion (or after streaming finishes).

## Patient data integration

Patient records live entirely in MongoDB. The `search_patient_records` tool:

1. Receives a `patient_id` (either a `user_id` UUID or a `patient_slug`) from the LangGraph agent
2. Resolves it against the `users` collection (`role: patient`) via `user_id` or `patient_slug`
3. Formats the `patient_profile` (demographics, conditions, medications, allergies, family history, lifestyle) plus the five most recent entries from the `documents` collection into a structured text summary
4. Returns a "no record found" message if neither lookup hits

No filesystem dependency, no restart required to pick up new or edited patients — it's a live read every turn.

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
