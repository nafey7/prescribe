# Documentation Map

Master index for all `prescribe-v2` documentation. Use the reading paths below to find the right docs for your task.

## Reading paths by role

### Backend work
1. [`CLAUDE.md`](../CLAUDE.md) — orientation
2. [`backend/CLAUDE.md`](../backend/CLAUDE.md) — folder map, request flow, patterns
3. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — system design, LangGraph flow
4. [`docs/TESTING.md`](TESTING.md) — backend test commands and strategy
5. [`docs/CODE_QUALITY.md`](CODE_QUALITY.md) — layering and type conventions

### Frontend work
1. [`CLAUDE.md`](../CLAUDE.md) — orientation
2. [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) — components, hooks, state flow
3. [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) — API contract, casing
4. [`docs/TESTING.md`](TESTING.md) — frontend test approach
5. [`docs/CODE_QUALITY.md`](CODE_QUALITY.md) — type safety, conventions

### Full-stack / cross-cutting work
1. [`CLAUDE.md`](../CLAUDE.md) — orientation
2. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — system overview
3. [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) — API boundary
4. Both area guides as needed

### Planning a new feature
1. [`CLAUDE.md`](../CLAUDE.md) — orientation
2. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — understand current design
3. [`docs/plans/`](plans/) — review existing plans for patterns
4. Use `/create-plan` Cursor command

### Data / patient records
1. [`data/CLAUDE.md`](../data/CLAUDE.md) — purpose and rules
2. [`docs/PATIENT_DATA.md`](PATIENT_DATA.md) — schema and naming conventions

## Topic index

| Topic | Canonical doc | Also mentioned in |
|-------|--------------|-------------------|
| System architecture | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | `backend/CLAUDE.md`, `README.md` |
| API endpoints & contract | [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) | `README.md`, `frontend/CLAUDE.md` |
| LangGraph agent flow | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | `backend/CLAUDE.md` |
| Streaming / SSE | [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) | `frontend/CLAUDE.md`, `backend/CLAUDE.md` |
| Patient file format | [`docs/PATIENT_DATA.md`](PATIENT_DATA.md) | `data/CLAUDE.md`, `README.md` |
| Docker setup | [`docs/LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md) | `README.md` |
| Testing | [`docs/TESTING.md`](TESTING.md) | area CLAUDE.md files |
| Code conventions | [`docs/CODE_QUALITY.md`](CODE_QUALITY.md) | area CLAUDE.md files |
| Backend folder layout | [`backend/CLAUDE.md`](../backend/CLAUDE.md) | `docs/ARCHITECTURE.md` |
| Frontend component layout | [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) | — |
| Implementation plans | [`docs/plans/`](plans/) | `docs/README.md` |

## Single source of truth rules

- **Architecture and data flow** → `docs/ARCHITECTURE.md` (not README)
- **API shapes and streaming behavior** → `docs/FRONTEND_BACKEND_COLLABORATION.md`
- **Patient file schema** → `docs/PATIENT_DATA.md`
- **Setup commands** → `docs/LOCAL_DEVELOPMENT.md` (README may summarize)
- **Test strategy** → `docs/TESTING.md`
- **Coding conventions** → `docs/CODE_QUALITY.md`

## Known gaps

- No E2E / Playwright test documentation (no E2E tests exist yet)
- No CI/CD documentation (no pipeline configured)
- No deployment / production documentation
- No API versioning strategy documented
