# Testing

Test strategy, commands, and conventions for `prescribe-v2`.

## Backend tests

### Running tests

Always run the suite **inside the backend Docker container** so Python dependencies, env, and paths match CI and production-like setups:

```bash
docker compose exec backend python -m pytest tests/ -v
```

`tests/conftest.py` forces `AUTH_REQUIRED=false`, `ENVIRONMENT=test`, and clears `get_settings()` cache so API tests behave like the relaxed-auth workflow even when the container’s `.env` enables strict JWT (see `auth_bypass_allowed()` in `backend/app/api/dependencies.py`). Tests that require strict auth patch env per test (e.g. `tests/test_route_audit.py`).

Running `pytest` on the host (`cd backend && python -m pytest`) can drift from the image and is not the supported workflow.

### Test files

| File | Coverage |
|------|----------|
| `tests/test_api_auth.py` | Auth HTTP API: signup, login, refresh rotation, reuse detection, logout, `/me` |
| `tests/test_auth_service.py` | JWT encode/decode, password hashing, `rotate_refresh_token` behavior |
| `tests/test_refresh_repository.py` | `refresh_tokens` collection: indexes, atomic rotation, family revoke |
| `tests/test_route_audit.py` | **Route audit:** unauthenticated requests to non–allow-listed routes must return **401, 403, or 405** |
| `tests/test_api_chat.py` | Chat routes, history ownership, SSE / patient context |
| `tests/test_api_patients.py` | Patient profile APIs and auth gates |
| `tests/test_api_documents.py` | Document upload/list/download and patient scoping |
| `tests/test_api_doctors.py`, `tests/test_api_doctor_patients.py`, `tests/test_api_doctor_chat.py` | Doctor portal and connection-aware routes |
| `tests/test_meal_plan.py` | Meal plan schema, extraction, chat API fields; doctor history includes `meal_plan` |
| `tests/test_repositories.py` | Repository helpers |
| `tests/test_seed.py` | Seed script smoke |
| Other `tests/test_*.py` | Schemas, dashboard, utils |

### Route-audit guardrail (Phase D)

`tests/test_route_audit.py` walks every FastAPI `APIRoute` and, for methods not on the explicit public allow-list (`GET /health`, `GET /api/config/features`, `POST /api/auth/signup`, `login`, `refresh`, `logout`), asserts an unauthenticated request does not return **200** (expected: **401**, **403**, or **405**).

**Adding a new public endpoint:** extend `PUBLIC_METHOD_PATHS` in that file and document why the route is unauthenticated.

### Shared fixtures (`tests/conftest.py`)

`conftest.py` sets safe defaults (`JWT_SECRET`, `AUTH_REQUIRED=false`) so the app imports before per-test env patches. Tests that need strict auth (e.g. route audit) use `monkeypatch` to set `AUTH_REQUIRED=true`, `ENVIRONMENT=test`, and a dedicated `JWT_SECRET`. Individual modules define fixtures such as `patient_token` / `auth_headers_patient` where needed — see `tests/test_api_auth.py` and patient/doctor API tests.

### Test framework

- **pytest** with **pytest-asyncio** for async tests
- **httpx** / **TestClient** for API tests where used
- Deterministic JWT and bcrypt rounds via env in tests (`BCRYPT_ROUNDS=4`)

### Where new backend tests go

- API/endpoint tests → `backend/tests/test_api_<area>.py`
- Service logic tests → `backend/tests/test_<service>_service.py` or `test_service_<area>.py`
- Auth / security regressions → `test_api_auth.py`, `test_auth_service.py`, `test_route_audit.py`

## Frontend tests

`npm run build` runs the TypeScript compiler (`tsc -b`) and production build. API client behavior (including **401 → refresh → retry** for RTK `baseApi`) is covered in Vitest where `*.test.ts` files exist (e.g. `frontend/src/api/baseApi.test.ts`, `frontend/src/api/chatStream.test.ts` for SSE `done` parsing).

### Manual verification (auth + chat)

1. Start the stack: `docker compose up --build -d`
2. Optional: set seeded user passwords — `docs/LOCAL_DEVELOPMENT.md` (**Authentication**)
3. Open `http://localhost:5173`, sign in at `/login`, confirm reload keeps the session (`sessionStorage` mirror)
4. Patient portal: send a chat message (streaming and non-streaming), open documents
5. Doctor portal: confirm doctor routes use the logged-in doctor id
6. Logout clears tokens; unauthenticated navigation redirects with `returnUrl`

## Test expectations

- All backend tests pass in the **backend container** before merging auth or API changes
- New backend features should include tests in the corresponding `tests/test_*.py` file
- Tests must be deterministic — mock LLMs and avoid live external APIs
- Prefer Mongo-dependent tests only when the stack provides Mongo (Docker compose)

## Known gaps

- No full Playwright E2E suite in-repo yet
- Frontend unit coverage is limited to selected modules (Vitest)
