# Local Development

Setup, Docker workflow, local dev commands, and troubleshooting for `prescribe-v2`.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Google Gemini API key **or** OpenAI API key
- For local (non-Docker) dev: Python 3.11+, Node.js 18+

## Initial setup

```bash
cd prescribe-v2

# Copy environment template
cp .env.example .env

# Edit .env and set your API key:
#   GOOGLE_API_KEY=your-key-here
#   (or set LLM_PROVIDER=openai and OPENAI_API_KEY=your-key-here)
```

## Docker workflow (recommended)

```bash
# Start all services (MongoDB, backend, frontend)
docker compose up --build -d

# Verify
docker compose ps                             # 3 services running
curl http://localhost:8000/health              # {"status":"ok"}
curl http://localhost:8000/api/chat/patients   # Patient list

# Open the app
open http://localhost:5173

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop
docker compose down

# Stop and delete data (MongoDB volume)
docker compose down -v
```

### Docker Compose services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| `mongodb` | `medical-chat-mongodb` | 27017 | MongoDB 7.0, health-checked |
| `backend` | `medical-chat-backend` | 8000 | FastAPI + Uvicorn |
| `frontend` | `medical-chat-frontend` | 5173 | Vite dev server |

The backend mounts `./backend` and `./data` as volumes for live reload. The frontend mounts `./frontend` with a separate `node_modules` volume.

## Local development (without Docker)

Useful for faster iteration when you only need one layer.

### Backend

```bash
cd backend
pip install -r requirements.txt

# Requires MongoDB running locally or via Docker:
# docker compose up -d mongodb

uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Set `VITE_API_URL=http://localhost:8000/api` if the backend is not behind the Docker network proxy.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `google` | LLM provider: `google` or `openai` |
| `GOOGLE_API_KEY` | — | Gemini API key (required if provider=google) |
| `OPENAI_API_KEY` | — | OpenAI API key (required if provider=openai) |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `medical_chat` | MongoDB database name |
| `PATIENT_DATA_DIR` | `data/patients` | Path to patient record files |
| `VITE_API_URL` | `/api` | Frontend API base URL (set in Docker Compose) |

## Troubleshooting

### Backend won't start
- Check that MongoDB is healthy: `docker compose ps` should show `healthy` for mongodb
- Verify your API key is set in `.env`
- Check backend logs: `docker compose logs backend`

### Frontend can't reach backend
- In Docker: the frontend container uses `VITE_API_URL=http://localhost:8000/api`
- Locally: ensure both services are running and CORS is configured (it allows all origins by default)

### MongoDB connection errors
- Docker: the backend uses `mongodb://mongodb:27017` (Docker network hostname)
- Local: the backend defaults to `mongodb://localhost:27017`
- To reset data: `docker compose down -v` removes the MongoDB volume

### New patient files not showing up
- Files in `data/patients/` are scanned at request time — no restart needed
- Ensure the filename matches `patient_<first>_<last>.md`
- Check that the file is not empty
