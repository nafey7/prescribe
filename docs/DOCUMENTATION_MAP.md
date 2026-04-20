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
2. [`docs/PRODUCT.md`](PRODUCT.md) — business context, roles, domain rules
3. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — system overview
4. [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) — API boundary
5. Both area guides as needed

### Planning a new feature
1. [`CLAUDE.md`](../CLAUDE.md) — orientation
2. [`docs/PRODUCT.md`](PRODUCT.md) — business rules and constraints
3. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — understand current design
4. [`docs/plans/`](plans/) — review existing plans for patterns
5. Use `/create-plan` Cursor command

### Patient data model
1. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — Patient data integration section (MongoDB-backed)
2. [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) — medical history API shape

## Topic index

| Topic | Canonical doc | Also mentioned in |
|-------|--------------|-------------------|
| Product vision & business rules | [`docs/PRODUCT.md`](PRODUCT.md) | `CLAUDE.md`, `README.md` |
| User roles & domain concepts | [`docs/PRODUCT.md`](PRODUCT.md) | `plans/PLAN_PRODUCT_BUILD_ORDER.md` |
| System architecture | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | `backend/CLAUDE.md`, `README.md` |
| API endpoints & contract | [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) | `README.md`, `frontend/CLAUDE.md` |
| LangGraph agent flow | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | `backend/CLAUDE.md` |
| Streaming / SSE | [`docs/FRONTEND_BACKEND_COLLABORATION.md`](FRONTEND_BACKEND_COLLABORATION.md) | `frontend/CLAUDE.md`, `backend/CLAUDE.md` |
| Patient data model | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | `docs/FRONTEND_BACKEND_COLLABORATION.md`, `README.md` |
| Docker setup | [`docs/LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md) | `README.md` |
| Testing | [`docs/TESTING.md`](TESTING.md) | area CLAUDE.md files |
| Code conventions | [`docs/CODE_QUALITY.md`](CODE_QUALITY.md) | area CLAUDE.md files |
| Backend folder layout | [`backend/CLAUDE.md`](../backend/CLAUDE.md) | `docs/ARCHITECTURE.md` |
| Frontend component layout | [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) | — |
| Implementation plans | [`docs/plans/`](plans/) | `docs/README.md` |

## Single source of truth rules

- **Product vision, roles, and business rules** → `docs/PRODUCT.md`
- **Architecture and data flow** → `docs/ARCHITECTURE.md` (not README)
- **API shapes and streaming behavior** → `docs/FRONTEND_BACKEND_COLLABORATION.md`
- **Patient data model** → `docs/ARCHITECTURE.md` (Patient data integration) + `docs/FRONTEND_BACKEND_COLLABORATION.md`
- **Setup commands** → `docs/LOCAL_DEVELOPMENT.md` (README may summarize)
- **Test strategy** → `docs/TESTING.md`
- **Coding conventions** → `docs/CODE_QUALITY.md`

## Known gaps

- No E2E / Playwright test documentation (no E2E tests exist yet)
- No CI/CD documentation (no pipeline configured)
- No deployment / production documentation
- No API versioning strategy documented
