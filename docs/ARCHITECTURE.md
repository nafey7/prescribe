# Architecture

System design and data flow for `prescribe-v2`. This is the canonical reference for how the pieces fit together.

## System overview

```
┌──────────────────────────────────────────────┐
│  Browser — React + Vite (port 5173)          │
│  ChatPage → MessageList + ChatInput          │
└───────────────────┬──────────────────────────┘
                    │ POST /api/chat/message/stream (SSE)
                    │ POST /api/chat/message (JSON)
                    ▼
┌──────────────────────────────────────────────┐
│  FastAPI (port 8000)                         │
│  api/chat.py → service/chat.py → ai/graph.py│
│       │                │                     │
│       ▼                ▼                     │
│    MongoDB        Patient docs (data/*.md)   │
└──────────────────────────────────────────────┘
```

Three Docker Compose services: `frontend`, `backend`, `mongodb`.

## Request flow (non-streaming)

1. User sends a message via the chat UI
2. Frontend `POST /api/chat/message` with `{ message, patient_id, chat_id? }`
3. `api/chat.py` validates the request via `ChatRequest` Pydantic model
4. `service/chat.py` `process_message()`:
   - Creates or retrieves the chat session (UUID-based `chat_id`)
   - Saves the user message to MongoDB via `repository/chat.py`
   - Invokes `ai/graph.py` `invoke_medical_agent()` with the message, patient ID, and chat ID
5. LangGraph agent loop runs (see below)
6. AI response is saved to MongoDB
7. Returns `ChatResponse { message, chat_id, message_id }`
8. Frontend renders the response with Markdown formatting

## Request flow (streaming)

1. Frontend `POST /api/chat/message/stream` with the same payload
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
- **Tools:** Currently one — `search_patient_records` reads `data/patients/patient_{id}.md`
- **LLM:** Configurable via `LLM_PROVIDER` env var — Google Gemini (default) or OpenAI
- **System prompt:** Injected as `SystemMessage` at the start of the message list, templated with `patient_id`

## Persistence model

**MongoDB collections:**

| Collection | Purpose | Key fields |
|------------|---------|-----------|
| `chat_sessions` | One doc per conversation | `chat_id`, `patient_id`, `created_at`, `updated_at` |
| `chat_messages` | One doc per message | `message_id`, `chat_id`, `patient_id`, `role`, `content`, `timestamp` |
| `checkpoints` (LangGraph) | Graph state checkpoints | Managed by `MongoDBSaver` |
| `checkpoint_writes` (LangGraph) | Checkpoint write log | Managed by `MongoDBSaver` |

Messages are written in order: user message saved before AI invocation, assistant message saved after completion (or after streaming finishes).

## Patient data integration

Patient records are Markdown files in `data/patients/` mounted into the backend container at `data/patients/`. The `search_patient_records` tool:

1. Receives `patient_id` (e.g., `john_doe`) from the LangGraph agent
2. Reads `data/patients/patient_{patient_id}.md`
3. Returns the full file content as a string
4. Falls back to listing available patients if the file doesn't exist

Files are scanned at request time — no restart needed to pick up new patients.

## Key dependencies

| Layer | Key packages |
|-------|-------------|
| Backend web | FastAPI, Uvicorn, Pydantic, pydantic-settings |
| Backend DB | Motor (async MongoDB), PyMongo |
| Backend AI | LangGraph, LangChain, langchain-google-genai, langchain-openai |
| Frontend UI | React 18, Vite 6, TypeScript 5, Tailwind CSS 3 |
| Frontend rendering | react-markdown, remark-gfm, @tailwindcss/typography |
| Orchestration | Docker Compose, MongoDB 7.0 |
