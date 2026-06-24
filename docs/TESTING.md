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
| `tests/test_ai_architecture.py` | Hidden runtime patient scope, checkpoint deletion, current-turn artifacts, failure status, newest-page history |
| `tests/test_api_patients.py` | Patient profile APIs and auth gates |
| `tests/test_api_documents.py` | Document upload/list/download and patient scoping |
| `tests/test_api_doctors.py`, `tests/test_api_doctor_patients.py`, `tests/test_api_doctor_chat.py` | Doctor portal and connection-aware routes |
| `tests/test_clinical_notes.py`, `tests/test_api_clinical_notes.py` | Clinical-note schemas, AI draft safety, canonical patient scope, publish/revise/read/correction API contracts |
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

## E2E tests (Playwright)

A Playwright-based E2E suite lives at the repo root as a sibling workspace to `backend/` and `frontend/`. It drives the real Docker stack (frontend on `:5173`, FastAPI on `:8000`, MongoDB on `:27017`) and exercises critical user journeys end-to-end.

The architectural plan with full rationale and follow-up phases is in [`docs/plans/PLAN_playwright-e2e-tests.md`](plans/PLAN_playwright-e2e-tests.md).

### When to run

- After any UI change that crosses pages (login → portal, sidebar nav).
- Before merging anything that touches auth, role routing, or `RequireAuth`.
- Before merging changes that alter the shape of `POST /api/auth/login` or `GET /api/auth/me`.

### Quick start

```bash
docker compose up -d
docker compose exec backend python -m seed   # idempotent — only needed once locally
npm --prefix e2e install                     # first time only
npx --prefix e2e playwright install --with-deps chromium  # first time only
npm --prefix e2e run test
```

### Folder map

```
e2e/
├── playwright.config.ts        # projects: setup, anonymous, patient, doctor
├── global.setup.ts             # waits on /health, logs each seed role in via API, writes .auth/*.json
├── fixtures/                   # extended `test` + seedUsers constants
├── pages/                      # POM-lite (LandingPage, PatientShellPage, DoctorShellPage, BasePage)
├── utils/                      # env.ts, waitForHealth.ts, apiClient.ts
└── tests/
    ├── smoke/                  # health.anonymous.spec.ts, landing.anonymous.spec.ts
    ├── auth/                   # patient-login, doctor-login, invalid-login, logout, protected-redirect
    └── patient/                # sidebar-nav.spec.ts
```

### Auth fixtures

The `setup` project runs once per test run and produces `.auth/patient.json` / `.auth/doctor.json` storage states via the real `POST /api/auth/login`. The `patient` and `doctor` projects load those into every browser context, so individual specs start authenticated without going through the login UI. Files in `.auth/` are gitignored and always overwritten on a fresh run.

### Selector hygiene

In order of preference: **`getByRole`** → **`getByLabel`** → **`getByText`** → **`getByTestId`**. CSS class names and XPath are not allowed.

Add `data-testid` deliberately, not as a sprinkle — only when a semantic selector is ambiguous or fragile. Today the suite uses test ids for the landing-login form (`login-email`, `login-password`, `login-submit`, `login-error`) and the patient sidebar (`nav-dashboard`, `nav-profile`, `nav-documents`, `nav-doctors`, `nav-meal-plans`, `nav-fitness-plans`). New test ids must ship in the **same PR** as the spec that consumes them.

### Data strategy

- Phase 1 specs are read-only on seed user state.
- Mutating specs (later phases) must namespace their accounts: `e2e-${Date.now()}-${randomSuffix}@example.test`.
- The suite never wipes Mongo — isolation is by data namespace, not by reset.

### Rules of engagement

1. One concern per spec.
2. No `waitForTimeout`. Prefer `expect(locator).toBeVisible()` / `toHaveURL`.
3. Auth is a fixture, not a UI step (except in the auth-flow specs themselves).
4. No real LLM calls in the default suite. Future LLM specs go behind a tag and an env flag.
5. Network mocks must be explicit and scoped (`page.route(...)`) — no global mocks.
6. Traces, screenshots, and video on **first retry only**.
7. Local retries default to `0` — if a spec flakes, fix it; do not paper over with retries.

### Common commands

| Command | Purpose |
|---------|---------|
| `npm --prefix e2e run test` | Run the full suite headless. |
| `npm --prefix e2e run test:headed` | Run with a visible browser. |
| `npm --prefix e2e run test:debug` | Run with the Playwright Inspector. |
| `npm --prefix e2e run test:report` | Open the last HTML report. |
| `npx --prefix e2e playwright test --project=anonymous` | Just the unauthenticated specs. |
| `npx --prefix e2e playwright test --project=patient` | Just the authenticated-patient specs. |

### Env vars

| Var | Default | Purpose |
|-----|---------|---------|
| `PW_BASE_URL` | `http://localhost:5173` | Frontend URL (`baseURL`). |
| `PW_API_URL` | `http://localhost:8000` | Backend URL for `apiClient`. |
| `PW_PATIENT_EMAIL` | `john@example.com` | Patient seed email. |
| `PW_DOCTOR_EMAIL` | `sarah@example.com` | Doctor seed email. |
| `PW_PASSWORD` | falls back to `DEV_DEFAULT_PASSWORD` | Seed password. Fails fast if unresolved. |

## Known gaps

- Doctor-portal E2E specs are not yet implemented (Phase 6 of the plan).
- Chat / LLM-dependent E2E specs (mocked SSE) are not yet implemented (Phase 7).
- No CI workflow yet (Phase 8) — local runner is CI-ready.
- Frontend unit coverage is limited to selected modules (Vitest).
