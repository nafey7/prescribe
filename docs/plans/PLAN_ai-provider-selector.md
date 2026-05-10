# AI Provider Selector — OpenAI / Gemini Value Decider

## 1. Title & Summary

Add a first-class, runtime-switchable provider selector to the backend AI layer so operators can choose between OpenAI and Google Gemini without restarting the server. A lightweight backend API endpoint exposes `GET/POST /api/config/ai-provider`, validated against which API keys are present. The existing `LLM_PROVIDER` env-var mechanism is retained as the startup default; the runtime value shadows it until the process restarts. **Default changes from `"google"` to `"openai"`**. Success criteria: changing the provider via the API immediately affects subsequent chat requests and title generation; the OpenAI model name is fully configurable via env (parity with Google); all provider-switching logic is consolidated in one place.

---

## 2. Type & Scope

**Type:** Enhancement (backend-primary, with optional frontend indicator)

**In scope:**
- Change `LLM_PROVIDER` default from `"google"` to `"openai"` in `config.py`
- Add `CHAT_MODEL_OPENAI` setting (mirrors `CHAT_MODEL_GOOGLE`; removes hardcoded `"gpt-4o-mini"` from `llm.py`)
- Introduce an in-process provider registry (`backend/app/ai/provider.py`) that holds the active provider and can be updated at runtime
- Refactor `get_llm()` and `get_title_llm()` to read from the registry instead of calling `get_settings()` directly
- Add `GET /api/config/ai-provider` and `POST /api/config/ai-provider` endpoints (doctor-auth-gated)
- Startup validation: warn (log) if the active provider's API key is missing
- Update `docs/ARCHITECTURE.md` and `docs/FRONTEND_BACKEND_COLLABORATION.md`

**Out of scope:**
- Per-user or per-session provider selection
- Frontend toggle UI (the API endpoint is sufficient; a UI can be added in a follow-up)
- Automatic failover / fallback between providers on error
- Adding new providers beyond OpenAI and Google

---

## 3. Baseline

Today the provider is selected entirely at startup via the `LLM_PROVIDER` env var (default `"google"`). Two issues exist:

| Gap | Location |
|-----|----------|
| Default is `"google"`, should be `"openai"` | `backend/app/config.py:13` |
| OpenAI chat model is hardcoded `"gpt-4o-mini"` | `backend/app/ai/llm.py:13` |
| Provider-switching logic is duplicated | `llm.py` and `chat_title.py:48-67` |
| No way to change provider without restart | no runtime API |
| No validation that the chosen provider's key is present | startup is silent |

Both `get_llm()` (`llm.py`) and `get_title_llm()` (`chat_title.py`) contain parallel `if settings.LLM_PROVIDER == "openai"` branches. `prescription_copilot_graph.py` delegates to `get_llm()` and is therefore unaffected structurally.

---

## 4. Prior Art & Strategy

**Existing approach:** env-var-based, locked at process startup, duplicated in two files.

**Proposed approach:** centralized in-process provider registry (`provider.py`) that:
1. Initialises from `settings.LLM_PROVIDER` at startup
2. Can be overwritten at runtime via the config API
3. Is the single source of truth for both `llm.py` and `chat_title.py`

**Why not stick with the existing approach?**
- The duplication in `llm.py` / `chat_title.py` will worsen as more AI components are added
- A restart is disruptive for a demo/prototype environment where teams want to compare providers mid-session
- Adding `CHAT_MODEL_OPENAI` to settings is additive and non-breaking

**Why not a database-stored setting?**
- For a prototype the simpler in-memory registry resets on deploy, which is the correct behaviour (env var is the durable source of truth)
- Avoids a MongoDB round-trip on every LLM instantiation

---

## 5. Target Architecture

```mermaid
flowchart TD
    ENV[".env / environment\nLLM_PROVIDER=openai"] -->|startup| REG["ai/provider.py\nProviderRegistry\n(singleton, thread-safe)"]
    API["POST /api/config/ai-provider\n{provider: 'openai'|'gemini'}"] -->|runtime override| REG
    GET["GET /api/config/ai-provider"] -->|reads| REG
    REG -->|get_active_provider()| LLM["ai/llm.py\nget_llm()"]
    REG -->|get_active_provider()| TITLE["ai/chat_title.py\nget_title_llm()"]
    LLM --> GRAPH["ai/graph.py\nLangGraph agent"]
    LLM --> COPILOT["ai/prescription_copilot_graph.py"]
    TITLE --> CHAT_SVC["service/chat.py\ngenerate_chat_title()"]
```

The `ProviderRegistry` is a module-level singleton (not a class instance stored in `app.state`) so it is accessible from `llm.py` and `chat_title.py` without threading FastAPI app references through utility layers.

---

## 6. Directory & File Plan

| Path | Purpose | Action |
|------|---------|--------|
| `backend/app/config.py` | Change `LLM_PROVIDER` default; add `CHAT_MODEL_OPENAI` | Modify |
| `backend/app/ai/provider.py` | New: `ProviderRegistry` singleton + `Literal["openai", "gemini"]` type | **New** |
| `backend/app/ai/llm.py` | Read provider from registry; use `CHAT_MODEL_OPENAI` setting | Modify |
| `backend/app/ai/chat_title.py` | Read provider from registry (remove duplicated logic) | Modify |
| `backend/app/api/config.py` | New: `GET/POST /api/config/ai-provider` router | **New** |
| `backend/app/api/router.py` | Mount the new config router | Modify |
| `backend/app/main.py` | Call `registry.init_from_settings()` in lifespan startup | Modify |
| `backend/tests/test_ai_provider.py` | Unit tests for registry + API endpoint | **New** |
| `docs/ARCHITECTURE.md` | Note runtime provider switching | Modify |
| `docs/FRONTEND_BACKEND_COLLABORATION.md` | Document new config endpoints | Modify |

---

## 7. API / Data

### New endpoints

Both endpoints require a valid doctor JWT (`Authorization: Bearer <token>`).

#### `GET /api/config/ai-provider`

```json
// 200 OK
{
  "provider": "openai",
  "available_providers": ["openai", "gemini"],
  "openai_key_present": true,
  "gemini_key_present": false
}
```

#### `POST /api/config/ai-provider`

```json
// Request body
{ "provider": "gemini" }

// 200 OK
{ "provider": "gemini" }

// 400 Bad Request (key missing)
{ "detail": "Cannot switch to 'gemini': GOOGLE_API_KEY is not configured." }

// 422 Unprocessable Entity (invalid value)
// (standard FastAPI / Pydantic validation)
```

**Schema** (Pydantic, `backend/app/schemas/config.py` — new file or add to existing):

```python
from typing import Literal
from pydantic import BaseModel

AIProvider = Literal["openai", "gemini"]

class AIProviderResponse(BaseModel):
    provider: AIProvider
    available_providers: list[AIProvider]
    openai_key_present: bool
    gemini_key_present: bool

class AIProviderRequest(BaseModel):
    provider: AIProvider
```

**snake_case / camelCase boundary:** These are backend-only admin endpoints; no frontend integration is planned in this phase. If a frontend consumer is added later, the existing `camelCase` API contract in `FRONTEND_BACKEND_COLLABORATION.md` applies.

**No database schema changes.** The active provider is held in-process only.

---

## 8. Edge Cases & Failure Handling

- **Provider key missing at switch time:** `POST /api/config/ai-provider` returns `400` with a clear message; registry is not updated.
- **Provider key missing at startup:** Log a `WARNING` but do not crash — the operator may set the key before first use (protects local dev without all keys).
- **Invalid provider string:** Pydantic `Literal` validation on the request body returns `422` automatically.
- **Concurrent requests during switch:** The registry uses `threading.Lock` around the write; in-flight requests see either old or new provider (no partial state).
- **Process restart:** Registry re-initialises from `LLM_PROVIDER` env var; any runtime override is lost (by design).
- **Both keys missing:** Startup logs a warning for each. Runtime switch to either provider returns `400`.
- **`lru_cache` on `get_settings()`:** Settings are read once and cached; the registry reads settings only at `init_from_settings()` and is the mutable runtime state. `get_llm()` must call `get_active_provider()` (registry) rather than `get_settings().LLM_PROVIDER` to pick up runtime changes.

---

## 9. Testing Strategy

All backend tests run in Docker: `docker compose exec backend python -m pytest tests/ -v`

| Test | File | Kind |
|------|------|------|
| Registry initialises from settings default | `test_ai_provider.py` | Unit |
| Registry switches provider; subsequent `get_llm()` returns correct type | `test_ai_provider.py` | Unit |
| Registry rejects switch when key absent | `test_ai_provider.py` | Unit |
| `GET /api/config/ai-provider` returns current state | `test_ai_provider.py` | Integration (TestClient) |
| `POST /api/config/ai-provider` with valid provider updates registry | `test_ai_provider.py` | Integration (TestClient) |
| `POST /api/config/ai-provider` with missing key returns 400 | `test_ai_provider.py` | Integration (TestClient) |
| `POST /api/config/ai-provider` with invalid value returns 422 | `test_ai_provider.py` | Integration (TestClient) |
| `get_llm()` returns `ChatOpenAI` when registry is `"openai"` | `test_ai_provider.py` | Unit (mock settings) |
| `get_llm()` returns `ChatGoogleGenerativeAI` when registry is `"gemini"` | `test_ai_provider.py` | Unit (mock settings) |

Tests must reset the registry singleton between test cases (provide a `reset()` method or use pytest fixtures that re-init the module state). Do not mock the entire `get_llm()` — test through the registry to verify the dispatch logic.

---

## 10. Risks & Rollback

| Risk | Mitigation |
|------|-----------|
| Breaking existing `LLM_PROVIDER=google` deployments | Default changes to `"openai"` but existing `.env` files that set `LLM_PROVIDER=google` are unchanged — those environments are unaffected |
| Hardcoded `"gpt-4o-mini"` removal breaks config that relied on it | New `CHAT_MODEL_OPENAI` defaults to `"gpt-4o-mini"` — backward-compatible |
| Registry singleton not thread-safe | Use `threading.Lock`; FastAPI is multi-threaded |
| `lru_cache` on settings prevents test isolation | Tests call `get_settings.cache_clear()` in fixture teardown |
| Registry not initialised before first request | `init_from_settings()` called in FastAPI `lifespan` startup hook |

**Rollback:** revert is a two-file change (`config.py` + `llm.py`) since the registry is additive. Setting `LLM_PROVIDER=google` in `.env` restores prior behaviour without any code change.

---

## 11. Implementation Phases (Detailed)

### Implementation order overview

1. Phase 1 — Config & Settings Foundation
2. Phase 2 — Provider Registry
3. Phase 3 — Refactor LLM Factories
4. Phase 4 — Runtime Config API
5. Phase 5 — Tests & Documentation

---

### Phase 1 — Config & Settings Foundation

**Goal:** Make `config.py` the authoritative, fully configurable source for provider defaults and model names — no hardcoded model strings anywhere else.

**Prerequisites:** None.

**Scope:**
- `config.py` changes only
- Does **not** touch `llm.py`, `chat_title.py`, or any API layer yet

**Tasks:**
1. In `backend/app/config.py`, change `LLM_PROVIDER` default from `"google"` to `"openai"` (line 13).
2. Add `CHAT_MODEL_OPENAI: str = "gpt-4o-mini"` below `CHAT_MODEL_GOOGLE` (line 18 area) so the OpenAI chat model is env-overridable.
3. Add a `Literal` type annotation to `LLM_PROVIDER` for early validation: `LLM_PROVIDER: Literal["openai", "gemini"] = "openai"` — requires `from typing import Literal`.
4. Update the comment above `CHAT_MODEL_GOOGLE` to note the parallel `CHAT_MODEL_OPENAI`.

**Deliverables:** `config.py` updated; no other files changed.

**Verification:**
```bash
# In the running container
docker compose exec backend python -c "from app.config import get_settings; s = get_settings(); print(s.LLM_PROVIDER, s.CHAT_MODEL_OPENAI)"
# Expected: openai gpt-4o-mini
```

---

### Phase 2 — Provider Registry

**Goal:** Introduce a thread-safe, module-level singleton that holds the active provider at runtime and can be updated without restarting.

**Prerequisites:** Phase 1 complete.

**Scope:**
- New file `backend/app/ai/provider.py` only
- Does **not** yet wire into `llm.py`, `chat_title.py`, or the API

**Tasks:**
1. Create `backend/app/ai/provider.py` with:
   ```python
   import threading
   from typing import Literal
   from app.config import get_settings

   AIProvider = Literal["openai", "gemini"]

   _lock = threading.Lock()
   _active: AIProvider = "openai"  # overwritten by init_from_settings()

   def init_from_settings() -> None:
       global _active
       with _lock:
           _active = get_settings().LLM_PROVIDER  # type: ignore[assignment]

   def get_active_provider() -> AIProvider:
       with _lock:
           return _active

   def set_active_provider(provider: AIProvider) -> None:
       with _lock:
           global _active
           _active = provider

   def reset() -> None:
       """Test helper: reset to settings default."""
       init_from_settings()
   ```
2. In `backend/app/main.py`, inside the `lifespan` async context manager (startup section), call `from app.ai.provider import init_from_settings; init_from_settings()`.

**Deliverables:** `backend/app/ai/provider.py` (new); `main.py` startup updated.

**Verification:**
```bash
docker compose exec backend python -c "
from app.ai.provider import init_from_settings, get_active_provider, set_active_provider
init_from_settings()
print(get_active_provider())          # openai
set_active_provider('gemini')
print(get_active_provider())          # gemini
"
```

---

### Phase 3 — Refactor LLM Factories

**Goal:** Consolidate all provider-dispatch logic so both `get_llm()` and `get_title_llm()` read from the registry (not `get_settings()` directly), and `get_llm()` uses `CHAT_MODEL_OPENAI` from settings.

**Prerequisites:** Phase 2 complete.

**Scope:**
- `backend/app/ai/llm.py` and `backend/app/ai/chat_title.py`
- Does **not** change `graph.py`, `prescription_copilot_graph.py`, or any callers

**Tasks:**
1. In `backend/app/ai/llm.py`:
   - Replace `settings.LLM_PROVIDER` check with `get_active_provider()` from `app.ai.provider`
   - Replace hardcoded `model="gpt-4o-mini"` with `model=settings.CHAT_MODEL_OPENAI`
   - Keep `get_settings()` call for api key and model name lookups (these remain env-only)
2. In `backend/app/ai/chat_title.py`:
   - Same substitution: replace `settings.LLM_PROVIDER` with `get_active_provider()`
   - No model-name changes needed (already uses `settings.CHAT_TITLE_MODEL_OPENAI` / `CHAT_TITLE_MODEL_GOOGLE`)

**Deliverables:** Both files updated; no hardcoded model strings; provider dispatch centralised.

**Verification:**
```bash
# With LLM_PROVIDER=openai (default), verify get_llm() type
docker compose exec backend python -c "
from app.ai.provider import init_from_settings
init_from_settings()
from app.ai.llm import get_llm
llm = get_llm()
print(type(llm).__name__)   # ChatOpenAI
"
```

---

### Phase 4 — Runtime Config API

**Goal:** Expose `GET` and `POST /api/config/ai-provider` endpoints so operators can inspect and switch the active provider at runtime without a restart. Endpoints are doctor-auth-gated.

**Prerequisites:** Phases 1–3 complete.

**Scope:**
- New `backend/app/api/config.py` router
- New or extended `backend/app/schemas/config.py` (Pydantic request/response models)
- `backend/app/api/router.py` — mount new router
- Does **not** touch `service/`, `repository/`, or the AI graph

**Tasks:**
1. Create `backend/app/schemas/config.py` (or add to an appropriate existing schemas file) with `AIProvider`, `AIProviderResponse`, `AIProviderRequest` as specified in §7.
2. Create `backend/app/api/config.py`:
   - `GET /ai-provider`: read `get_active_provider()`, check which API keys are non-empty in settings, return `AIProviderResponse`.
   - `POST /ai-provider`: validate `provider` value via Pydantic; check the target provider's API key is present in settings (400 if not); call `set_active_provider()`; return `AIProviderResponse` with updated state.
   - Both routes use the existing `get_current_doctor` dependency from `api/dependencies.py` for auth.
3. In `backend/app/api/router.py`, include the new config router with prefix `/config`.

**Deliverables:** Two new endpoints live under `/api/config/ai-provider`; doctor JWT required.

**Verification:**
```bash
# Assuming a valid doctor token $TOKEN
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/config/ai-provider | python -m json.tool
# Expect: {"provider": "openai", "available_providers": ["openai", "gemini"], ...}

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gemini"}' \
  http://localhost:8000/api/config/ai-provider | python -m json.tool
# Expect: 400 if GOOGLE_API_KEY absent, or 200 with {"provider": "gemini", ...}

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic"}' \
  http://localhost:8000/api/config/ai-provider
# Expect: 422
```

---

### Phase 5 — Tests & Documentation

**Goal:** Verify all new behaviour with automated tests and update docs so the change is navigable.

**Prerequisites:** Phases 1–4 complete.

**Scope:**
- New `backend/tests/test_ai_provider.py`
- `docs/ARCHITECTURE.md` and `docs/FRONTEND_BACKEND_COLLABORATION.md` updates

**Tasks:**
1. Write `backend/tests/test_ai_provider.py` covering all test cases listed in §9. Use a pytest `autouse` fixture that calls `reset()` and `get_settings.cache_clear()` between tests.
2. Add a `conftest.py` fixture (or extend existing) for a `TestClient` authenticated as a doctor for the config endpoint integration tests.
3. Update `docs/ARCHITECTURE.md` — add a "AI Provider" section noting runtime switching via `ProviderRegistry` and the startup env default.
4. Update `docs/FRONTEND_BACKEND_COLLABORATION.md` — add `GET/POST /api/config/ai-provider` to the API contract table with auth requirement and response shape.

**Deliverables:** All 9 test cases green; docs updated.

**Verification:**
```bash
docker compose exec backend python -m pytest tests/test_ai_provider.py -v
# All tests pass
```

**Notes:** This phase can partially run in parallel with Phase 4 — the registry unit tests (Phase 2) can be written once `provider.py` exists; the API integration tests require Phase 4 to be merged first.
