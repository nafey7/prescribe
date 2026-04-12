# CLAUDE.md — AI Navigation for prescribe-v2

This file is the primary entry point for AI agents and contributors working in this repository. Read this first, then follow links to area-specific guides and deep docs.

## What is this project?

A medical AI chat prototype: React + Vite frontend, FastAPI + LangGraph backend, MongoDB for persistence, Docker Compose for orchestration. Users select a patient, ask health-related questions, and get AI responses grounded in patient records stored as Markdown files.

## Documentation reading order

1. **This file** — orientation and critical rules
2. **Area guide** — pick the one matching your task:
   - [`backend/CLAUDE.md`](backend/CLAUDE.md) — FastAPI, LangGraph, MongoDB
   - [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — React, Vite, Tailwind chat UI
   - [`data/CLAUDE.md`](data/CLAUDE.md) — patient record files
3. **Deep docs** — consult as needed:
   - [`docs/PRODUCT.md`](docs/PRODUCT.md) — business context, user roles, domain rules
   - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and request flow
   - [`docs/FRONTEND_BACKEND_COLLABORATION.md`](docs/FRONTEND_BACKEND_COLLABORATION.md) — API contract, casing, ownership
   - [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) — setup, Docker, env vars
   - [`docs/TESTING.md`](docs/TESTING.md) — test strategy and commands
   - [`docs/PATIENT_DATA.md`](docs/PATIENT_DATA.md) — patient file schema and rules
   - [`docs/CODE_QUALITY.md`](docs/CODE_QUALITY.md) — layering, types, conventions
4. **Full index** — [`docs/DOCUMENTATION_MAP.md`](docs/DOCUMENTATION_MAP.md)

## Domain routing

| Task | Start here |
|------|-----------|
| Backend bug or feature | `backend/CLAUDE.md` → `docs/ARCHITECTURE.md` |
| Frontend bug or feature | `frontend/CLAUDE.md` → `docs/FRONTEND_BACKEND_COLLABORATION.md` |
| Patient data change | `data/CLAUDE.md` → `docs/PATIENT_DATA.md` |
| Product / business rules | `docs/PRODUCT.md` |
| Cross-stack feature | `docs/ARCHITECTURE.md` + `docs/FRONTEND_BACKEND_COLLABORATION.md` |
| New implementation plan | `docs/plans/` — use `/create-plan` command |
| Setup / onboarding | `docs/LOCAL_DEVELOPMENT.md` |

## Critical rules

- **Do not hallucinate paths.** Only reference files that actually exist in the repo.
- **Update docs when you change behavior.** If you modify an API endpoint, update `docs/FRONTEND_BACKEND_COLLABORATION.md`. If you change architecture, update `docs/ARCHITECTURE.md`.
- **Patient data is educational.** Files in `data/patients/` are synthetic samples — never treat them as real PHI.
- **Keep area CLAUDE.md files navigational.** Push deep content into `docs/` rather than bloating area guides.
- **Plans live in `docs/plans/`.** Do not add plan files to the repo root.

## Common commands

```bash
# Start everything
docker compose up --build -d

# Stop everything
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run backend tests
docker compose exec backend python -m pytest tests/ -v

# Local backend dev (without Docker)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Local frontend dev (without Docker)
cd frontend && npm install && npm run dev
```

## Project structure (overview)

```
prescribe-v2/
├── backend/          # FastAPI + LangGraph + MongoDB
├── frontend/         # React + Vite + Tailwind
├── data/patients/    # Markdown patient records (runtime AI context)
├── docs/             # Deep reference documentation
│   └── plans/        # Implementation plans
└── .cursor/commands/ # Cursor slash-command docs
```
