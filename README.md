# Medical AI Chat Prototype

A medical AI chat application that reads each patient's structured profile from MongoDB and uses it as context to answer symptom queries, suggest diagnoses, and recommend medicines.

**Stack:** React + Vite frontend, FastAPI + LangGraph backend, MongoDB for persistence — all orchestrated via Docker Compose.

> **Disclaimer:** This is an educational prototype. It does not provide real medical advice. Always consult a qualified healthcare professional.

> **For AI agents:** Start with [`CLAUDE.md`](CLAUDE.md) for navigation. For detailed reference docs, see [`docs/`](docs/README.md).

---

## Architecture

```
┌──────────────────────────────────────────────┐
│  Browser — React + Vite (port 5173)          │
│  ChatPage → MessageList + ChatInput          │
└───────────────────┬──────────────────────────┘
                    │ POST /api/chat/message
                    ▼
┌──────────────────────────────────────────────┐
│  FastAPI (port 8000)                         │
│  api/chat.py → service/chat.py → ai/graph.py│
│       │                │                     │
│       ▼                ▼                     │
│    MongoDB (patient profiles + chat state)   │
└──────────────────────────────────────────────┘

LangGraph:  START → agent ←→ tools → END
                       │
                       ▼
              search_patient_records
```

**Data flow:**
1. User types a message → frontend `POST /api/chat/message`
2. Backend loads/creates chat session, invokes LangGraph agent
3. Agent reads the patient profile from MongoDB via `search_patient_records` tool
4. Agent synthesizes response → persisted to MongoDB → returned to frontend
5. Frontend renders the AI response with markdown formatting

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Google Gemini API key **or** OpenAI API key

### Setup

```bash
# 1. Clone / navigate to project
cd prescribe-v2

# 2. Configure environment
cp .env.example .env
# Edit .env and add your API key:
#   GOOGLE_API_KEY=your-key-here
#   (or set LLM_PROVIDER=openai and OPENAI_API_KEY=your-key-here)

# 3. Start everything
docker compose up --build -d

# 4. Open in browser
open http://localhost:5173
```

### Verify

```bash
docker compose ps                          # 3 services running
curl http://localhost:8000/health           # {"status":"ok"}
curl http://localhost:8000/api/chat/patients  # List of patients
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `google` | LLM provider: `google` or `openai` |
| `GOOGLE_API_KEY` | — | Gemini API key (required if provider=google) |
| `OPENAI_API_KEY` | — | OpenAI API key (required if provider=openai) |
| `MONGODB_URI` | `mongodb://mongodb:27017` | MongoDB connection string |
| `DATABASE_NAME` | `medical_chat` | MongoDB database name |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat/message` | Send a message, get AI response |
| `GET` | `/api/chat/history/{chat_id}` | Get chat history |
| `GET` | `/api/chat/patients` | List available patients |
| `GET` | `/health` | Health check |

### Example Request

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"What medications is John on?","patient_id":"john_doe"}'
```

---

## Adding New Patients

New patients are created through the registration API or seed scripts — there are no files to edit. Each patient's profile in the `users` collection (with `role: patient`) is the single source of truth for demographics, conditions, medications, allergies, family history, and lifestyle. Uploaded documents live in the `documents` collection. The `search_patient_records` tool reads from those collections at request time.

---

## Project Structure

```
prescribe-v2/
├── docker-compose.yml          # Orchestrates 3 services
├── .env.example                # Environment template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app entry
│       ├── config.py           # Settings (pydantic-settings)
│       ├── api/chat.py         # REST endpoints
│       ├── service/chat.py     # Business logic
│       ├── repository/chat.py  # MongoDB CRUD
│       ├── database/           # Motor connection
│       ├── schemas/chat.py     # Pydantic models
│       └── ai/
│           ├── graph.py        # LangGraph agent
│           ├── tools.py        # DB-backed patient profile tool
│           ├── prompts.py      # System prompt
│           ├── llm.py          # LLM factory
│           └── state.py        # Graph state
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── api/chat.ts         # API client
│       ├── hooks/useChat.ts    # Chat state hook
│       └── components/
│           ├── ChatPage.tsx    # Main layout
│           ├── MessageList.tsx # Message display
│           ├── ChatMessage.tsx # Single message bubble
│           ├── ChatInput.tsx   # Input bar
│           └── PatientSelector.tsx
└── init-mongo.js               # DB initialization
```

---

## Commands Reference

```bash
docker compose up --build -d      # Start everything
docker compose down               # Stop everything
docker compose down -v            # Stop + delete data
docker compose logs -f backend    # View backend logs
docker compose logs -f frontend   # View frontend logs

# Run backend tests
docker compose exec backend python -m pytest tests/ -v

# Local development (without Docker)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```
