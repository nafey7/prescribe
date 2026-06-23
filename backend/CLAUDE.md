# Backend — CLAUDE.md

FastAPI + LangGraph + MongoDB backend for the medical AI chat. Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Folder map

```
backend/
├── app/
│   ├── main.py              # FastAPI app, lifespan, CORS, router mount
│   ├── config.py            # Pydantic Settings (env vars, defaults)
│   ├── api/
│   │   ├── router.py        # APIRouter aggregation (/api prefix)
│   │   └── chat.py          # REST endpoints: /message, /message/stream, /history, /patients
│   ├── service/
│   │   └── chat.py          # Business logic: process_message, process_message_stream, list_patients
│   ├── repository/
│   │   └── chat.py          # MongoDB CRUD: sessions and messages (Motor async)
│   ├── database/
│   │   └── connection.py    # Motor client lifecycle (connect/close/get_database)
│   ├── schemas/
│   │   └── chat.py          # Pydantic request/response models (ChatRequest, ChatResponse, etc.)
│   └── ai/
│       ├── graph.py         # LangGraph StateGraph: agent ↔ tools loop, invoke + stream
│       ├── tools.py         # search_patient_records tool (reads MongoDB users/documents)
│       ├── prompts.py       # System prompt template
│       ├── llm.py           # LLM factory (Google Gemini or OpenAI)
│       └── state.py         # MedicalChatState TypedDict
├── tests/
│   └── test_api_chat.py     # API endpoint tests
├── requirements.txt
└── Dockerfile
```

## Request flow

```
HTTP request
  → api/chat.py (endpoint validation, routing)
    → service/chat.py (session management, orchestration)
      → repository/chat.py (MongoDB read/write)
      → ai/graph.py (LangGraph agent invocation)
        → ai/tools.py (patient record lookup)
        → ai/llm.py (LLM call via LangChain)
      → repository/chat.py (persist AI response)
    ← response
  ← HTTP response (JSON or SSE stream)
```

## Key patterns

- **Layered architecture:** API → Service → Repository → AI. Business logic lives in `service/`, not in endpoints or repositories.
- **Pydantic everywhere:** Request validation via `schemas/chat.py`, settings via `pydantic-settings`.
- **Async with Motor:** All MongoDB operations use Motor's async driver. The LangGraph graph runs sync internally but is wrapped with `asyncio.to_thread` for the non-streaming path.
- **Streaming via SSE:** `POST /message/stream` returns `text/event-stream` with `thinking`, `token`, `done`, and `error` events. Full response is only persisted after stream completion.
- **LangGraph checkpointing:** Graph state is checkpointed to MongoDB via `langgraph-checkpoint-mongodb`, keyed by `chat_id` as `thread_id`.
- **Tool pattern:** Tools are LangChain `@tool`-decorated functions. Patient-data tools receive the authorized `patient_id` through hidden LangGraph state injection, never from model-visible arguments. Profile, lab, and extracted-document retrieval are available alongside privacy-filtered web search and structured-output tools.

## Dependencies

Prefer installing packages **inside the backend container** so they match the deployed image. Pin versions in **`requirements.txt`** and commit it. After edits: `docker compose exec backend pip install -r requirements.txt`. **`pip` does not remove packages** that were deleted from the file—use `pip uninstall` for removed deps or **rebuild the image**. See the root [`CLAUDE.md`](../CLAUDE.md) section *Dependency changes in Docker*.

## Testing

**Mandatory for agents and contributors:** run pytest **only** via the backend container (same Python + site-packages as production). From the **repo root**, with `docker compose up` already running:

```bash
docker compose exec backend python -m pytest tests/ -v
```

Do **not** use host `cd backend && python -m pytest` (or a local venv) as the default — it is unsupported for validating changes and can miss dependency or path issues. One-off host runs are fine only when the user explicitly asks and understands the drift risk.

Tests live in `backend/tests/`. New tests should follow the existing pattern of one test file per module area.

Cross-stack journeys (login, role routing, full request flow) are covered by the Playwright suite in `e2e/` — see [`docs/TESTING.md`](../docs/TESTING.md) (E2E section). Run it whenever a backend change touches `/auth/*`, `/me`, public allow-list, or anything observable from the patient/doctor portal shell.

## Deep docs

- [Architecture and data flow](../docs/ARCHITECTURE.md)
- [API contract and streaming](../docs/FRONTEND_BACKEND_COLLABORATION.md)
- [Testing strategy](../docs/TESTING.md)
- [Code quality conventions](../docs/CODE_QUALITY.md)
