# CLAUDE.md — AI Navigation for prescribe

This file is the primary entry point for AI agents and contributors working in this repository. Read this first, then follow links to area-specific guides and deep docs.

## What is this project?

A medical AI chat prototype: React + Vite frontend, FastAPI + LangGraph backend, MongoDB for persistence, Docker Compose for orchestration. Users select a patient, ask health-related questions, and get AI responses grounded in each patient's profile (demographics, conditions, medications, allergies, family history, lifestyle) stored in MongoDB.

## Documentation reading order

1. **This file** — orientation and critical rules
2. **Area guide** — pick the one matching your task:
   - [`backend/CLAUDE.md`](backend/CLAUDE.md) — FastAPI, LangGraph, MongoDB
   - [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — React, Vite, MUI chat UI
3. **Deep docs** — consult as needed:
   - [`docs/PRODUCT.md`](docs/PRODUCT.md) — business context, user roles, domain rules
   - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and request flow
   - [`docs/FRONTEND_BACKEND_COLLABORATION.md`](docs/FRONTEND_BACKEND_COLLABORATION.md) — API contract, casing, ownership
   - [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) — setup, Docker, env vars
   - [`docs/TESTING.md`](docs/TESTING.md) — test strategy and commands
   - [`docs/CODE_QUALITY.md`](docs/CODE_QUALITY.md) — layering, types, conventions
4. **Full index** — [`docs/DOCUMENTATION_MAP.md`](docs/DOCUMENTATION_MAP.md)

## Domain routing

| Task | Start here |
|------|-----------|
| Backend bug or feature | `backend/CLAUDE.md` → `docs/ARCHITECTURE.md` |
| Frontend bug or feature | `frontend/CLAUDE.md` → `docs/FRONTEND_BACKEND_COLLABORATION.md` |
| Patient data change | `docs/FRONTEND_BACKEND_COLLABORATION.md` (profile APIs) |
| Product / business rules | `docs/PRODUCT.md` |
| Cross-stack feature | `docs/ARCHITECTURE.md` + `docs/FRONTEND_BACKEND_COLLABORATION.md` |
| New implementation plan | `docs/plans/` — use `/create-plan` command |
| Testing strategy (any layer) | `docs/TESTING.md` |
| E2E / Playwright work or setup | `docs/TESTING.md` (E2E section) → `e2e/README.md` |
| Setup / onboarding | `docs/LOCAL_DEVELOPMENT.md` |

## Critical rules

- **Backend tests always run in Docker.** Use `docker compose exec backend python -m pytest …` from the repo root with the stack running. Do **not** treat `cd backend && pytest` on the host as the primary or authoritative test run — deps and env can drift from the image. (Agents: default to the container command unless the user explicitly asks for a one-off host run.)
- **E2E tests run against the live Docker stack.** Start it (`docker compose up -d`) and ensure seed users exist (`docker compose exec backend python -m seed`) before `npm --prefix e2e run test`.
- **Do not hallucinate paths.** Only reference files that actually exist in the repo.
- **Update docs when you change behavior.** If you modify an API endpoint, update `docs/FRONTEND_BACKEND_COLLABORATION.md`. If you change architecture, update `docs/ARCHITECTURE.md`.
- **Patient data is educational.** Seeded and registered patient data in MongoDB is synthetic — never treat it as real PHI.
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

# Run backend tests (always use the backend container; do not rely on host pytest)
docker compose exec backend python -m pytest tests/ -v

# Run end-to-end tests (Playwright; stack must be up first)
npm --prefix e2e run test

# Sync backend Python deps in the running container (after requirements.txt changes)
docker compose exec backend pip install -r requirements.txt
# Rebuild images when Dockerfile/base image changes or after removing pip packages — see "Dependency changes in Docker"

# Local backend dev (without Docker)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Local frontend dev (without Docker)
cd frontend && npm install && npm run dev
```

### Dependency changes in Docker (npm and Python)

**Principle:** Version pins live in **`package-lock.json`** (frontend) and **`backend/requirements.txt`** (backend). Commit those files. The running app uses **packages inside each container**, not your host `node_modules` or host venv.

| Action | Safer approach |
|--------|----------------|
| **Add or upgrade a package** | Update manifests on the host (e.g. `npm install <pkg>` in `frontend/`, or edit `requirements.txt`), commit the lockfile / requirements, then **sync the running container** (below). |
| **Remove an npm package** | Run `npm uninstall` on the host so `package.json` and **`package-lock.json`** both change, commit, then in the container prefer **`npm ci`** so `node_modules` matches the lockfile and removed packages disappear. |
| **Remove a Python package** | Edit `requirements.txt` and commit. **`pip install -r requirements.txt` does not uninstall** packages that were removed from the file. Either **`pip uninstall <name>`** in the container for each removed top-level package, or **rebuild the backend image** so the layer/site-packages stays honest. |
| **Dockerfile or base image changed** | **`docker compose up --build -d`** (or `docker compose build --no-cache` when you need a completely clean install). |
| **Something still looks wrong after edits** | Recreate with a fresh build: `docker compose up --build -d` (and `docker compose down` first if you need to reset volumes—only do that when you understand data loss implications, e.g. not casually for Mongo). |

**Frontend (npm)** — Compose mounts `./frontend` but uses a **separate volume for `/app/node_modules`**, so the container does not use your host `node_modules`.

- **`npm ci`** installs **exactly** what is in `package-lock.json` (fast, reproducible). Use it in the container after lockfile changes, especially after **adding or removing** packages:  
  `docker compose exec frontend npm ci`
- **`npm install`** in the container is acceptable for quick syncs when the lockfile already matches what you want, but **`npm ci` is preferred** when you care about strict lockfile fidelity.

Restart the frontend container if the dev server does not pick up changes: `docker compose restart frontend`.

The **frontend Dockerfile** uses `npm ci` at image build time so image builds track the lockfile.

**Backend (pip)** — The image installs from `backend/requirements.txt` at **build** time; the compose mount does not replace site-packages on the host.

- After **adding** or **bumping** versions in `requirements.txt`:  
  `docker compose exec backend pip install -r requirements.txt`
- After **removing** packages, prefer **rebuild** or explicit **`pip uninstall`**, as noted above.

Do not assume `pip install` or `npm install` only on the host affects behavior inside Docker unless you run services without containers.

## Project structure (overview)

```
prescribe/
├── backend/          # FastAPI + LangGraph + MongoDB
├── frontend/         # React + Vite + MUI
├── e2e/              # Playwright end-to-end suite (drives the live Docker stack)
├── docs/             # Deep reference documentation
│   └── plans/        # Implementation plans
└── .cursor/commands/ # Cursor slash-command docs
```
