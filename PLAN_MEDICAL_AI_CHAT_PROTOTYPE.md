# Medical AI Chat Prototype — Implementation Plan

## 1. Title & Summary

Build a standalone medical AI chat prototype: a single-page React (Vite) frontend with a FastAPI + LangGraph backend, backed by MongoDB for chat persistence, all orchestrated via Docker Compose. The AI agent reads patient prescription/medical-history files (`.txt`/`.md` stored in the codebase) and uses them as context to answer symptom queries, suggest diagnoses, and recommend medicines. No authentication — this is a foundational prototype.

**Success criteria:** `docker compose up` brings up frontend, backend, and MongoDB; user opens the browser, types a symptom-related question, and receives an AI response grounded in the patient's medical files within seconds.

---

## 2. Type & Scope

**Type:** Feature (greenfield prototype)

### In scope

- React + Vite chat UI (single page, no routing beyond `/`)
- FastAPI backend with `/api/chat/message` and `/api/chat/history` endpoints
- LangGraph single-agent graph with a RAG-style tool that reads patient docs
- MongoDB collection for chat history persistence
- Docker Compose (frontend, backend, MongoDB) with one-command startup
- Sample patient prescription files (`data/patients/`)
- README with setup and run instructions

### Out of scope

- Authentication / user management
- Multi-patient switching UI (hardcoded patient context or selectable via simple dropdown — no user accounts)
- Production deployment, SSL, rate limiting
- Streaming / SSE (simple request-response like Voya; streaming can be Phase 2)
- Fine-tuned medical models (uses general-purpose Gemini/OpenAI with system prompt constraints)
- HIPAA compliance, audit logging, real PHI

---

## 3. Baseline — Patterns Borrowed from Voya

| Concern | Voya pattern | What we reuse |
|---------|-------------|---------------|
| LangGraph graph | `StateGraph` → nodes → conditional edges, `MongoDBSaver` checkpointer | Same structure, simplified to one agent node + one tool node |
| Chat API | `POST /api/chat/message` → `ChatRequest(message, chat_id)` → `ChatResponse(message, chat_id)` | Identical contract shape, stripped of intent/type/data fields |
| Frontend chat | RTK Query mutation `sendMessage`, `ChatPanel` + `ChatMessage` components | Simplified: plain `fetch` or lightweight RTK Query; single panel, no typed bubbles |
| Docker | `compose.dev.yaml` with MongoDB, backend, frontend on one bridge network | Same topology, three services only |
| MongoDB | Motor async ODM, connection via `MONGODB_URI` env var | Same driver, simpler schema |

**Strategy decision:** Voya's patterns are proven and straightforward. We mirror them closely (consistency, less invention) but strip away multi-agent routing, auth middleware, and rich message types since they're unnecessary for a prototype.

---

## 4. Prior Art & Strategy

### Existing approach (Voya)

- Multi-agent supervisor graph with 4+ specialist sub-graphs, checkpoint versioning, chain responses, sticky intents
- JWT-authenticated chat endpoints with per-chat locks and rate limiting
- Rich frontend with Redux slices, Material-UI, typed message bubbles, multi-page routing

### Proposed approach (this prototype)

- **Single ReAct agent** with one tool (`search_patient_records`) that performs keyword/semantic lookup over local `.txt`/`.md` files
- **Zero-auth API** — no middleware, no user model
- **Minimal frontend** — one component tree, Tailwind CSS for styling, no Redux (React state + `fetch` is sufficient for a prototype)

**Why deviate:** Voya's complexity exists to serve a production travel platform. A medical prototype needs the same *shape* (graph, API, chat UI) but at 10% of the surface area. Copying Voya's full stack would add weeks of unnecessary work. We take the architectural skeleton and simplify every layer.

---

## 5. Target Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌─────────────────────────────────────────────┐ │
│  │  React + Vite (port 5173)                   │ │
│  │  ChatPage → MessageList + InputBar          │ │
│  └──────────────────┬──────────────────────────┘ │
└─────────────────────┼───────────────────────────-┘
                      │ POST /api/chat/message
                      ▼
┌─────────────────────────────────────────────────┐
│  FastAPI (port 8000)                             │
│  ┌───────────┐  ┌────────────┐  ┌─────────────┐ │
│  │  api/     │→ │  service/  │→ │  ai/graph/  │ │
│  │  chat.py  │  │  chat.py   │  │  medical.py │ │
│  └───────────┘  └─────┬──────┘  └──────┬──────┘ │
│                       │                 │        │
│                       ▼                 ▼        │
│              ┌──────────────┐  ┌──────────────┐  │
│              │  MongoDB     │  │ Patient docs │  │
│              │  (messages)  │  │ data/*.md    │  │
│              └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────┘

LangGraph (inside ai/graph/):

  START → medical_agent ←→ tools → END
              │
              ▼
     search_patient_records (reads .md/.txt files)
```

**Data flow:**
1. User types message → frontend `POST /api/chat/message { message, chat_id? }`
2. Backend `chat_service.process_message()` → loads/creates chat, invokes LangGraph
3. LangGraph `medical_agent` node runs Gemini/OpenAI with system prompt + chat history; may call `search_patient_records` tool
4. Tool reads patient files from `data/patients/`, returns relevant excerpts
5. Agent synthesizes response → service persists to MongoDB → returns `ChatResponse`
6. Frontend appends bot message to message list

---

## 6. Directory & File Plan

```
medical-ai-chat/
├── docker-compose.yml
├── .env.example
├── README.md
├── data/
│   └── patients/
│       ├── patient_john_doe.md        # Sample prescription/history
│       ├── patient_jane_smith.md
│       └── patient_alex_kumar.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app, lifespan, CORS, router mount
│   │   ├── config.py                  # Settings via pydantic-settings
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # APIRouter aggregator
│   │   │   └── chat.py               # POST /message, GET /history/{chat_id}
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── chat.py               # ChatRequest, ChatResponse, MessageSchema
│   │   ├── service/
│   │   │   ├── __init__.py
│   │   │   └── chat.py               # Orchestrates graph + persistence
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   └── connection.py          # Motor client, get_db()
│   │   ├── repository/
│   │   │   ├── __init__.py
│   │   │   └── chat.py               # MongoDB CRUD for messages
│   │   └── ai/
│   │       ├── __init__.py
│   │       ├── graph.py               # LangGraph StateGraph definition
│   │       ├── state.py               # MedicalChatState TypedDict
│   │       ├── tools.py               # search_patient_records tool
│   │       ├── prompts.py             # System prompt for medical agent
│   │       └── llm.py                 # LLM factory (Gemini / OpenAI)
│   └── tests/
│       ├── __init__.py
│       ├── test_api_chat.py
│       └── test_tools.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css                  # Tailwind base imports
│       ├── api/
│       │   └── chat.ts               # fetch wrapper for /api/chat/*
│       ├── components/
│       │   ├── ChatPage.tsx           # Main page: header + messages + input
│       │   ├── MessageList.tsx        # Scrollable message list
│       │   ├── ChatMessage.tsx        # Single message bubble (user/bot)
│       │   ├── ChatInput.tsx          # Text input + send button
│       │   └── PatientSelector.tsx    # Simple dropdown to pick patient file
│       ├── hooks/
│       │   └── useChat.ts            # Chat state management hook
│       └── types/
│           └── chat.ts               # Message, ChatResponse types
└── init-mongo.js                      # DB + collection init script
```

| Path | Purpose | Status |
|------|---------|--------|
| `docker-compose.yml` | Orchestrate all 3 services | New |
| `backend/Dockerfile` | Python 3.12 container | New |
| `backend/requirements.txt` | All Python deps pinned | New |
| `backend/app/main.py` | FastAPI app entry | New |
| `backend/app/ai/graph.py` | LangGraph medical agent | New |
| `backend/app/ai/tools.py` | Patient doc search tool | New |
| `frontend/Dockerfile` | Node 20 container | New |
| `frontend/package.json` | React + Vite + Tailwind | New |
| `frontend/src/components/ChatPage.tsx` | Chat UI | New |
| `data/patients/*.md` | Sample patient records | New |

---

## 7. API / Data

### Endpoints

#### `POST /api/chat/message`

```json
// Request
{
  "message": "John has been having headaches and dizziness for 3 days",
  "chat_id": "optional-uuid",
  "patient_id": "john_doe"          // maps to patient_john_doe.md
}

// Response
{
  "message": "Based on John's medical history showing hypertension...",
  "chat_id": "uuid",
  "message_id": "uuid"
}
```

#### `GET /api/chat/history/{chat_id}`

```json
// Response
{
  "chat_id": "uuid",
  "messages": [
    { "role": "user", "content": "...", "timestamp": "ISO8601" },
    { "role": "assistant", "content": "...", "timestamp": "ISO8601" }
  ]
}
```

#### `GET /api/patients`

```json
// Response — lists available patient files
{
  "patients": [
    { "id": "john_doe", "name": "John Doe", "file": "patient_john_doe.md" },
    { "id": "jane_smith", "name": "Jane Smith", "file": "patient_jane_smith.md" }
  ]
}
```

### MongoDB Collections

**`chat_messages`**
```json
{
  "_id": "ObjectId",
  "chat_id": "uuid",
  "patient_id": "john_doe",
  "role": "user | assistant",
  "content": "string",
  "timestamp": "datetime"
}
```

**`chat_sessions`**
```json
{
  "_id": "ObjectId",
  "chat_id": "uuid",
  "patient_id": "john_doe",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

LangGraph checkpoints stored via `MongoDBSaver` in `langgraph_checkpoints` / `langgraph_checkpoint_writes` collections (automatic).

### Case conventions

- Backend (Python): `snake_case` everywhere
- Frontend (TypeScript): `camelCase` in code, API responses consumed as-is (snake_case from backend) — use a small transform util or keep snake_case in API layer types

---

## 8. Edge Cases & Failure Handling

| # | Edge case | Handling |
|---|-----------|----------|
| 1 | Patient file not found | Tool returns "No records found for this patient"; agent responds accordingly |
| 2 | Empty message sent | Pydantic validator rejects; 422 with detail |
| 3 | LLM API key missing/invalid | App startup logs warning; runtime returns 503 with "AI service unavailable" |
| 4 | LLM timeout (>30s) | `asyncio.wait_for` wrapper; return 504 with retry suggestion |
| 5 | MongoDB down | Lifespan health check fails loudly on startup; runtime catches `ConnectionFailure` → 503 |
| 6 | Very long chat history | Trim to last 20 messages in LangGraph state to stay within token limits |
| 7 | Patient file is empty | Tool returns "Patient records are empty"; agent uses general knowledge with disclaimer |
| 8 | Concurrent requests for same chat_id | No lock needed for prototype (single user); future: add async lock like Voya |
| 9 | Non-medical questions | System prompt instructs agent to politely redirect to medical topics |

---

## 9. Testing Strategy

| Layer | Tool | What to test | Notes |
|-------|------|-------------|-------|
| API | pytest + httpx (`TestClient`) | Request validation, response shape, 404/422/503 | Mock service layer |
| Service | pytest | Message persistence, graph invocation, error paths | Mock LLM responses |
| Tools | pytest | File reading, patient matching, empty file handling | Use test fixture files |
| Frontend | Vitest + Testing Library | Message rendering, input submission, loading state | Mock fetch |
| E2E (optional) | Manual or Playwright | Full flow: type message → see response | Docker-based |

**Must not be flaky:** Tool tests (pure file I/O), API schema validation tests.

---

## 10. Risks & Rollback

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| LLM generates harmful medical advice | High (prototype) | Strong system prompt disclaimer; UI banner "Not real medical advice" |
| LangGraph checkpoint schema changes between versions | Medium | Pin `langgraph` version tightly |
| Docker build slow on first run | Low | Use `.dockerignore`, layer caching |
| Token cost overruns during development | Medium | Use `gemini-2.0-flash` (cheap); set `max_tokens` limit |
| Patient data files grow too large for context window | Low | Chunking in tool; return top-K relevant sections |

**Rollback:** Since this is a standalone prototype with no production dependencies, rollback = `docker compose down -v && git checkout main`.

---

## 11. Implementation Phases (Detailed)

### Implementation Order Overview

1. **Phase 1 — Project Scaffolding & Docker Infrastructure**
2. **Phase 2 — Backend Foundation (FastAPI + MongoDB)**
3. **Phase 3 — AI Layer (LangGraph + Patient Doc Tool)**
4. **Phase 4 — Chat Service & API Endpoints**
5. **Phase 5 — Frontend Chat UI**
6. **Phase 6 — Integration, Polish & Documentation**

---

### Phase 1 — Project Scaffolding & Docker Infrastructure

**Goal:** Create the project skeleton, Docker Compose, Dockerfiles, and confirm all three containers start and communicate.

**Prerequisites:** None.

**Scope:** Directory structure, Docker files, environment config, sample patient data files. *Deferred:* application code (backend routes, frontend components, AI logic).

**Tasks:**

1. Create root project directory `medical-ai-chat/` with the full directory tree from Section 6 (empty `__init__.py` files, placeholder `main.py` files)
2. Write `docker-compose.yml`:
   - **mongodb** service: `mongo:7.0`, volume `mongodb-data:/data/db`, healthcheck `mongosh --eval 'db.runCommand("ping")'`, port `27017:27017`
   - **backend** service: build from `./backend`, port `8000:8000`, depends_on mongodb healthy, env `MONGODB_URI=mongodb://mongodb:27017`, `DATABASE_NAME=medical_chat`
   - **frontend** service: build from `./frontend`, port `5173:5173`, depends_on backend
   - Single bridge network `medical-net`
3. Write `backend/Dockerfile`:
   ```dockerfile
   FROM python:3.12-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 8000
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
   ```
4. Write `backend/requirements.txt` with initial deps (FastAPI, uvicorn only — AI deps added Phase 3)
5. Write minimal `backend/app/main.py` — FastAPI app with a health endpoint `GET /health → {"status": "ok"}`
6. Write `frontend/Dockerfile`:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package.json package-lock.json* ./
   RUN npm install
   COPY . .
   EXPOSE 5173
   CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
   ```
7. Write `frontend/package.json` with React + Vite + TypeScript + Tailwind deps (see packages list below)
8. Write minimal `frontend/src/App.tsx` — renders "Medical AI Chat" heading
9. Write Vite config, TypeScript config, Tailwind config, PostCSS config
10. Create `data/patients/` with 3 sample patient files:
    - `patient_john_doe.md` — hypertension, diabetes type 2, current medications, allergies
    - `patient_jane_smith.md` — asthma, anxiety, current medications
    - `patient_alex_kumar.md` — no chronic conditions, recent flu, pediatric patient
11. Write `.env.example` documenting all environment variables
12. Write `init-mongo.js` — create database and collections with indexes
13. Write `.dockerignore` files for backend and frontend (exclude `node_modules`, `__pycache__`, `.git`, etc.)

**Packages — Backend (`requirements.txt` Phase 1):**
```
fastapi>=0.115.0,<1.0.0
uvicorn[standard]>=0.32.0,<1.0.0
motor>=3.6.0,<4.0.0
pydantic>=2.10.0,<3.0.0
pydantic-settings>=2.6.0,<3.0.0
```

**Packages — Frontend (`package.json` dependencies):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

**Deliverables:**
- All Docker files written and buildable
- `docker compose up` starts 3 containers, all healthy
- `curl http://localhost:8000/health` → `{"status":"ok"}`
- `http://localhost:5173` shows "Medical AI Chat" heading
- 3 sample patient files in `data/patients/`

**Verification:**
```bash
cd medical-ai-chat
docker compose up --build -d
docker compose ps                          # 3 services "Up"
curl http://localhost:8000/health           # {"status":"ok"}
curl -s http://localhost:5173 | head -20   # HTML with app root
docker compose logs backend | grep "Uvicorn running"
docker compose down
```

---

### Phase 2 — Backend Foundation (FastAPI + MongoDB)

**Goal:** Establish the FastAPI app structure with config, database connection, Pydantic schemas, repository layer, and basic wiring — everything except AI and chat API.

**Prerequisites:** Phase 1 (Docker running, backend container healthy).

**Scope:** `config.py`, `database/connection.py`, `repository/chat.py`, `schemas/chat.py`, `api/router.py`. *Deferred:* AI graph (Phase 3), chat endpoint logic (Phase 4).

**Tasks:**

1. Implement `app/config.py` — `Settings(BaseSettings)` with:
   - `MONGODB_URI: str = "mongodb://localhost:27017"`
   - `DATABASE_NAME: str = "medical_chat"`
   - `LLM_PROVIDER: str = "google"` (or `"openai"`)
   - `GOOGLE_API_KEY: str = ""`
   - `OPENAI_API_KEY: str = ""`
   - `PATIENT_DATA_DIR: str = "data/patients"`
   - `model_config = SettingsConfigDict(env_file=".env")`
   - Singleton `get_settings()` function
2. Implement `app/database/connection.py`:
   - `motor.motor_asyncio.AsyncIOMotorClient` setup
   - `connect_to_mongodb()` / `close_mongodb()` functions
   - `get_database()` returning the db instance
   - Mirror Voya's lifespan pattern: connect on startup, disconnect on shutdown
3. Update `app/main.py`:
   - Add `lifespan` async context manager (connect/disconnect MongoDB)
   - Mount API router under `/api`
   - Add CORS middleware (allow all origins for prototype)
4. Implement `app/schemas/chat.py`:
   - `ChatRequest(BaseModel)`: `message: str`, `chat_id: str | None = None`, `patient_id: str = "john_doe"`
   - `ChatResponse(BaseModel)`: `message: str`, `chat_id: str`, `message_id: str`
   - `MessageSchema(BaseModel)`: `role: str`, `content: str`, `timestamp: datetime`
   - `ChatHistoryResponse(BaseModel)`: `chat_id: str`, `messages: list[MessageSchema]`
   - `PatientInfo(BaseModel)`: `id: str`, `name: str`, `file: str`
5. Implement `app/repository/chat.py`:
   - `save_message(chat_id, patient_id, role, content)` → insert into `chat_messages`
   - `get_messages(chat_id, limit=50)` → fetch sorted by timestamp
   - `create_session(chat_id, patient_id)` → insert into `chat_sessions`
   - `get_session(chat_id)` → fetch session
6. Implement `app/api/router.py` — `APIRouter` that includes `chat_router`
7. Create stub `app/api/chat.py` — routes declared but returning placeholder responses (full logic in Phase 4)

**Deliverables:**
- Clean app structure with config, DB connection, schemas, repository
- App starts, connects to MongoDB, CORS enabled
- Stub routes return 200 with placeholder data

**Verification:**
```bash
docker compose up --build -d
docker compose logs backend | grep "Connected to MongoDB"
curl http://localhost:8000/api/chat/message -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' 
# Should return placeholder response (200)
```

---

### Phase 3 — AI Layer (LangGraph + Patient Doc Tool)

**Goal:** Build the LangGraph agent that can read patient files and answer medical questions. This phase is backend-only, testable via Python without the API.

**Prerequisites:** Phase 1 (patient data files exist). Independent of Phase 2 DB layer (can be built in parallel if desired).

**Scope:** `ai/state.py`, `ai/llm.py`, `ai/prompts.py`, `ai/tools.py`, `ai/graph.py`. *Deferred:* wiring to chat service (Phase 4), frontend (Phase 5).

**Tasks:**

1. Add AI dependencies to `requirements.txt`:
   ```
   langgraph>=0.3.0,<1.0.0
   langchain>=0.3.0,<1.0.0
   langchain-google-genai>=2.0.0,<3.0.0
   langchain-openai>=0.3.0,<1.0.0
   langchain-core>=0.3.0,<1.0.0
   langgraph-checkpoint-mongodb>=0.3.0,<1.0.0
   ```
2. Implement `app/ai/state.py`:
   ```python
   class MedicalChatState(TypedDict):
       messages: Annotated[list, add_messages]
       patient_id: str
   ```
3. Implement `app/ai/llm.py`:
   - `get_llm(provider, model)` factory returning `ChatGoogleGenerativeAI` or `ChatOpenAI`
   - Default model: `gemini-2.0-flash` (fast, cheap) or `gpt-4o-mini`
4. Implement `app/ai/prompts.py`:
   - System prompt: medical assistant persona, reads patient records, provides analysis based on symptoms + history, always adds disclaimer about consulting real doctors, redirects non-medical questions
5. Implement `app/ai/tools.py` — `search_patient_records` tool:
   - Takes `patient_id: str` and `query: str`
   - Reads `data/patients/patient_{patient_id}.md`
   - Returns file contents (for prototype, return full file; files are small)
   - Handles missing file gracefully
   - Decorated with `@tool` from langchain_core
6. Implement `app/ai/graph.py`:
   - `build_medical_graph()` → `StateGraph(MedicalChatState)`
   - Bind tools to LLM: `llm.bind_tools([search_patient_records])`
   - Nodes: `agent` (calls LLM with messages + system prompt), `tools` (executes tool calls)
   - Edges: `agent` → conditional → `tools` or `END`; `tools` → `agent`
   - `MongoDBSaver` checkpointer for conversation persistence
   - `invoke_medical_agent(message, patient_id, chat_id, db)` async function that builds config with `thread_id=chat_id` and runs `graph.ainvoke()`
7. Write `tests/test_tools.py`:
   - Test `search_patient_records` with existing file → returns content
   - Test with missing file → returns "not found" message
   - Test with empty file → returns "empty" message

**Packages added to `requirements.txt` (cumulative):**
```
langgraph>=0.3.0,<1.0.0
langchain>=0.3.0,<1.0.0
langchain-google-genai>=2.0.0,<3.0.0
langchain-openai>=0.3.0,<1.0.0
langchain-core>=0.3.0,<1.0.0
langgraph-checkpoint-mongodb>=0.3.0,<1.0.0
```

**Deliverables:**
- Fully functional LangGraph graph callable from Python
- Patient doc tool reads and returns file contents
- LLM factory supports Google and OpenAI
- Unit tests for tools pass

**Verification:**
```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/test_tools.py -v
# Manual test (requires API key):
python -c "
import asyncio
from app.ai.graph import invoke_medical_agent
result = asyncio.run(invoke_medical_agent('What medications is John on?', 'john_doe', 'test-chat'))
print(result)
"
```

**Notes:** Can run in parallel with Phase 2 (no dependency on DB layer for tool testing; checkpointer needs MongoDB at runtime but graph construction is independent).

---

### Phase 4 — Chat Service & API Endpoints

**Goal:** Wire the AI graph to the API layer via a chat service; implement the actual chat and patient-listing endpoints.

**Prerequisites:** Phase 2 (DB + schemas) and Phase 3 (AI graph).

**Scope:** `service/chat.py`, `api/chat.py` (full implementation). *Deferred:* frontend (Phase 5).

**Tasks:**

1. Implement `app/service/chat.py`:
   - `process_message(message, chat_id, patient_id, db)`:
     - Generate `chat_id` if not provided (UUID4)
     - Create or fetch chat session
     - Save user message to MongoDB via repository
     - Call `invoke_medical_agent(message, patient_id, chat_id, db)`
     - Extract assistant response from graph output
     - Save assistant message to MongoDB
     - Return `ChatResponse`
   - `get_chat_history(chat_id, db)`:
     - Fetch messages from repository
     - Return `ChatHistoryResponse`
   - `list_patients(data_dir)`:
     - Scan `data/patients/` directory for `.md`/`.txt` files
     - Parse filename to extract patient ID and derive display name
     - Return list of `PatientInfo`
2. Implement `app/api/chat.py` (replace stubs):
   - `POST /chat/message` — validate request, call service, return response; try/except for LLM errors → 503
   - `GET /chat/history/{chat_id}` — call service, return history; 404 if not found
   - `GET /patients` — call service, return patient list
3. Write `tests/test_api_chat.py`:
   - Test POST with valid message → 200 + correct shape (mock service)
   - Test POST with empty message → 422
   - Test GET history with valid chat_id → 200
   - Test GET history with unknown chat_id → 404 or empty
   - Test GET patients → list of patients

**Deliverables:**
- Working API: send message, get response from AI, persist in MongoDB
- Patient listing endpoint
- API tests pass

**Verification:**
```bash
docker compose up --build -d
# Send a message
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"John has headaches, what could it be?","patient_id":"john_doe"}'
# Should return AI-generated response with chat_id

# Get history
curl http://localhost:8000/api/chat/history/<chat_id_from_above>

# List patients
curl http://localhost:8000/api/patients
```

---

### Phase 5 — Frontend Chat UI

**Goal:** Build the React chat interface — a single page with message list, input bar, and patient selector.

**Prerequisites:** Phase 4 (API endpoints working).

**Scope:** All frontend components, API client, styling. *Deferred:* polish, error boundaries, dark mode (Phase 6).

**Tasks:**

1. Set up Tailwind CSS properly:
   - `tailwind.config.js` with content paths
   - `postcss.config.js`
   - `src/index.css` with `@tailwind` directives
2. Implement `src/types/chat.ts`:
   ```typescript
   interface Message { role: "user" | "assistant"; content: string; timestamp: string; }
   interface ChatResponse { message: string; chat_id: string; message_id: string; }
   interface Patient { id: string; name: string; file: string; }
   ```
3. Implement `src/api/chat.ts`:
   - `sendMessage(message, chatId?, patientId?)` → POST, returns `ChatResponse`
   - `getChatHistory(chatId)` → GET, returns messages array
   - `getPatients()` → GET, returns patient list
   - Base URL from `import.meta.env.VITE_API_URL` (default `http://localhost:8000/api`)
4. Implement `src/hooks/useChat.ts`:
   - State: `messages`, `chatId`, `isLoading`, `error`
   - `sendMessage(text)`: append user message optimistically, call API, append bot response
   - `loadHistory(chatId)`: fetch and set messages
   - `clearChat()`: reset state
5. Implement `src/components/ChatMessage.tsx`:
   - Renders user messages (right-aligned, blue) and assistant messages (left-aligned, gray)
   - Assistant messages rendered with `react-markdown` for formatted output
   - Timestamp display
6. Implement `src/components/MessageList.tsx`:
   - Scrollable container, auto-scroll to bottom on new messages
   - Empty state: "Ask a question about your patient's health"
   - Loading indicator (pulsing dots) when waiting for response
7. Implement `src/components/ChatInput.tsx`:
   - Text input + send button (or Enter to send)
   - Disabled while loading
   - Auto-focus on mount
8. Implement `src/components/PatientSelector.tsx`:
   - Dropdown at top of chat
   - Fetches patient list on mount
   - On change: clear chat, set new patient context
9. Implement `src/components/ChatPage.tsx`:
   - Composes: header (app title + medical disclaimer banner), PatientSelector, MessageList, ChatInput
   - Responsive layout: full height, centered max-width container
10. Implement `src/App.tsx`:
    - Renders `ChatPage` full screen
    - Global styles, font setup
11. Configure Vite proxy for development:
    ```typescript
    // vite.config.ts
    server: {
      proxy: { "/api": "http://localhost:8000" }
    }
    ```

**Deliverables:**
- Functional chat UI at `http://localhost:5173`
- Send messages, see AI responses with markdown formatting
- Switch between patients
- Auto-scroll, loading states, empty state

**Verification:**
```bash
docker compose up --build -d
# Open http://localhost:5173 in browser
# 1. See patient selector with 3 patients
# 2. Type "What medications is John currently on?" → see AI response
# 3. Type follow-up "Could his headaches be related to his medications?" → see contextual response
# 4. Switch patient to Jane Smith → chat clears
# 5. Ask about Jane → see response based on Jane's records
```

---

### Phase 6 — Integration, Polish & Documentation

**Goal:** Final integration testing, UI polish, error handling improvements, and complete documentation.

**Prerequisites:** Phases 1–5 complete.

**Scope:** Error boundaries, medical disclaimer, README, minor styling, cleanup.

**Tasks:**

1. Add medical disclaimer banner to UI:
   - Persistent banner: "⚠️ This is a prototype. Not real medical advice. Always consult a healthcare professional."
   - Cannot be dismissed
2. Add error handling in frontend:
   - Network error → "Failed to connect to server" message in chat
   - API error (503) → "AI service temporarily unavailable" message
   - Display errors inline in the message list (not alerts)
3. Add frontend loading skeleton:
   - Typing indicator (animated dots) while waiting for AI response
4. Polish UI:
   - Responsive design (mobile-friendly)
   - Smooth scroll behavior
   - Subtle animations on message appear (fade in)
   - Clean typography, proper spacing
5. Write comprehensive `README.md`:
   - Project description
   - Architecture diagram (ASCII or mermaid)
   - Prerequisites (Docker, API keys)
   - Quick start: `cp .env.example .env`, fill in API key, `docker compose up`
   - Available commands
   - How to add new patient files
   - Environment variables reference
   - Project structure overview
6. Finalize `.env.example` with all variables documented
7. Test full Docker Compose flow from clean state:
   - `docker compose down -v`
   - `docker compose up --build`
   - Verify everything works
8. Add `.gitignore` covering Python, Node, Docker artifacts

**Deliverables:**
- Polished, usable prototype
- Complete README
- Clean Docker startup from scratch
- Medical disclaimer visible

**Verification:**
```bash
# Clean start test
docker compose down -v
docker compose up --build -d
docker compose ps   # all healthy

# Full flow test in browser
# 1. Disclaimer banner visible
# 2. Select patient → ask question → get response
# 3. Follow-up questions maintain context
# 4. Switch patient → fresh context
# 5. Reload page → can start new chat

# Stop everything
docker compose down -v
```

**Notes:** This phase can be split across multiple small PRs; no single task is large.

---

## Appendix: Complete Package Lists

### Backend — `requirements.txt` (final)

```
# Web framework
fastapi>=0.115.0,<1.0.0
uvicorn[standard]>=0.32.0,<1.0.0

# Data validation & config
pydantic>=2.10.0,<3.0.0
pydantic-settings>=2.6.0,<3.0.0

# Database
motor>=3.6.0,<4.0.0

# AI / LangGraph
langgraph>=0.3.0,<1.0.0
langchain>=0.3.0,<1.0.0
langchain-core>=0.3.0,<1.0.0
langchain-google-genai>=2.0.0,<3.0.0
langchain-openai>=0.3.0,<1.0.0
langgraph-checkpoint-mongodb>=0.3.0,<1.0.0

# Testing
pytest>=8.0.0,<9.0.0
pytest-asyncio>=0.24.0,<1.0.0
httpx>=0.27.0,<1.0.0
```

### Frontend — `package.json` dependencies (final)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

### Commands Reference

```bash
# Start everything
docker compose up --build -d

# Stop everything
docker compose down

# Stop + delete data
docker compose down -v

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild single service
docker compose up --build backend -d

# Run backend tests
docker compose exec backend python -m pytest tests/ -v

# Local development (without Docker)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```
