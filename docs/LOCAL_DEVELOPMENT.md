# Local Development

Setup, Docker workflow, local dev commands, and troubleshooting for `prescribe`.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Google Gemini API key **or** OpenAI API key
- For local (non-Docker) dev: Python 3.11+, Node.js 18+

## Initial setup

```bash
cd prescribe

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

**Changing dependencies (add/remove packages):** Containers do not use your host installs. Follow the **Dependency changes in Docker** section in the root [`CLAUDE.md`](../CLAUDE.md) (lockfile + `npm ci` for frontend; `requirements.txt` + pip/rebuild for backend).

## Authentication (Phase D)

To log in at `/login` when `AUTH_REQUIRED=true`, set a dev password and JWT secret, then seed (or re-hash users).

1. Add to `.env` (or export in your shell), for example:
   - `JWT_SECRET=<long random string, not the placeholder "change-me">`
   - `AUTH_REQUIRED=true` is the default; set `AUTH_REQUIRED=false` only for legacy header identity in `local` / `test`
   - `DEV_DEFAULT_PASSWORD=<8+ chars with at least one letter and one digit>` — **required** when running `python -m seed`; bcrypt hashes are written during seed using `BCRYPT_ROUNDS`
   - Optional: `BCRYPT_ROUNDS` (default `12`)
2. Restart the stack (or reload env) so the backend and seed process pick up variables.
3. Run the seed from `backend` with the same env (Docker example):

   ```bash
   docker compose exec -e DEV_DEFAULT_PASSWORD="$DEV_DEFAULT_PASSWORD" backend \
     python -m seed
   ```

4. Sign in at `http://localhost:5173/login` with a seeded email (see `backend/seed.py`, e.g. `john@example.com` or `omar@example.com`) and `DEV_DEFAULT_PASSWORD` (or the per-user override below).

If you already have users in MongoDB and only need to set or rotate password hashes, run `python -m app.scripts.set_dev_passwords` instead of or after seed (same `DEV_DEFAULT_PASSWORD` rules).

**Dev bypass:** When `AUTH_REQUIRED=false` and `ENVIRONMENT` is `local` or `test`, the API still accepts `X-Patient-Id` / `X-Doctor-Id` for the dev identity picker. When a Bearer access token is present, those headers are ignored for authorization.

**Per-user dev passwords (optional):** Seed and `set_dev_passwords` apply `DEV_DEFAULT_PASSWORD` to every user unless you set `DEV_PASSWORD_<EMAIL_NORMALIZED>` — email uppercased, non-alphanumeric runs replaced by underscores (e.g. `jane@example.com` → `DEV_PASSWORD_JANE_EXAMPLE_COM`). See `backend/app/scripts/set_dev_passwords.py`.

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
| `DOCUMENT_MODEL_OPENAI` | `gpt-4o-mini` | OpenAI model for direct PDF classification and structured prescription/lab extraction |
| `OCR_ENABLED` | `false` | Reserved for future local OCR processing; the current PDF flow sends files directly to OpenAI and does not invoke Tesseract |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `medical_chat` | MongoDB database name |
| `VITE_API_URL` | `/api` | Frontend API base URL (set in Docker Compose) |
| `JWT_SECRET` | `""` | HS256 signing key; **required** when `AUTH_REQUIRED=true` (cannot be empty or `change-me`) |
| `AUTH_REQUIRED` | `true` | When `true`, protected routes require `Authorization: Bearer`. Set `false` only for local legacy header identity (with `ENVIRONMENT=local` or `test`). |
| `ENVIRONMENT` | `local` | `local`, `test`, etc.; dev header bypass only when `local` or `test` and `AUTH_REQUIRED=false` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed browser origins (list in config) |
| `DEV_DEFAULT_PASSWORD` | — | Required for `python -m seed` (bcrypt hashes for seed users) and for `python -m app.scripts.set_dev_passwords` |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost (tests often use `4`) |

## Troubleshooting

### Backend won't start
- Check that MongoDB is healthy: `docker compose ps` should show `healthy` for mongodb
- Verify your API key is set in `.env`
- Check backend logs: `docker compose logs backend`

### Frontend can't reach backend
- In Docker: the frontend container uses `VITE_API_URL=http://localhost:8000/api`
- Locally: ensure both services are running; CORS allows only `CORS_ALLOWED_ORIGINS` (default includes `http://localhost:5173`)

### Login returns 401 after enabling AUTH_REQUIRED
- Seed users need password hashes: run `python -m seed` with `DEV_DEFAULT_PASSWORD` set, or run `python -m app.scripts.set_dev_passwords` (see **Authentication** above).
- Confirm `JWT_SECRET` is set and the backend was restarted.

### MongoDB connection errors
- Docker: the backend uses `mongodb://mongodb:27017` (Docker network hostname)
- Local: the backend defaults to `mongodb://localhost:27017`
- To reset data: `docker compose down -v` removes the MongoDB volume

### New patients not showing up
- Patients are stored in the `users` collection with `role: patient`; each carries a `patient_profile`
- Register via the API or re-run the seed script (`python -m seed`) to repopulate
- No restart is needed — the AI tool reads the DB live every turn
