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
│       ├── tools.py         # search_patient_records tool (reads data/patients/*.md)
│       ├── prompts.py       # System prompt template
│       ├── llm.py           # LLM factory (Google Gemini or OpenAI)
│       └── state.py         # MedicalChatState TypedDict
├── tests/
│   ├── test_api_chat.py     # API endpoint tests
│   └── test_tools.py        # Tool function tests
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
- **Tool pattern:** Tools are LangChain `@tool`-decorated functions. Currently only `search_patient_records`.

## Testing

```bash
# In Docker
docker compose exec backend python -m pytest tests/ -v

# Local
cd backend && python -m pytest tests/ -v
```

Tests live in `backend/tests/`. New tests should follow the existing pattern of one test file per module area.

## Deep docs

- [Architecture and data flow](../docs/ARCHITECTURE.md)
- [API contract and streaming](../docs/FRONTEND_BACKEND_COLLABORATION.md)
- [Testing strategy](../docs/TESTING.md)
- [Code quality conventions](../docs/CODE_QUALITY.md)
