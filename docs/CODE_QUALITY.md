# Code Quality

Layering rules, type safety, validation conventions, and documentation maintenance expectations for `prescribe-v2`.

## Layering rules

### Backend

The backend follows a strict layered architecture:

```
api/       → HTTP concerns only (routing, status codes, response types)
service/   → Business logic, orchestration, data transformation
repository/→ Database operations (MongoDB CRUD via Motor)
ai/        → LangGraph agent, LLM, tools, prompts
schemas/   → Pydantic models for request/response validation
database/  → Connection lifecycle
config.py  → Environment-driven settings
```

**Boundaries to preserve:**
- API endpoints should not contain business logic — delegate to service functions
- Service functions should not import FastAPI or return HTTP-specific types
- Repository functions should not know about AI or business rules
- AI modules should not directly access the database — the service layer orchestrates persistence

### Frontend

```
api/        → HTTP client functions (fetch, SSE parsing)
hooks/      → State management, side effects
components/ → React components (UI rendering)
types/      → TypeScript interfaces
```

**Boundaries to preserve:**
- Components should not call `fetch` directly — use functions from `api/`
- The `useChat` hook owns message state — components consume it, not duplicate it
- Type definitions live in `types/`, not scattered across component files

## Type safety

### Backend (Python)
- Use type hints on all function signatures
- Use `pydantic.BaseModel` for request/response validation at API boundaries
- Use `pydantic-settings` for configuration with environment variable binding
- Use `TypedDict` for LangGraph state definitions
- Prefer `str | None` over `Optional[str]`

### Frontend (TypeScript)
- All interfaces live in `types/chat.ts`
- Use explicit return types on API client functions
- Use `interface` for data shapes, not `type` aliases (existing convention)
- API responses use `snake_case` fields (matching backend JSON)
- React state uses `camelCase` (standard React convention)

## Validation boundaries

| Layer | What it validates | How |
|-------|------------------|-----|
| Backend API | Request shape, field lengths | Pydantic `ChatRequest` with `Field` constraints |
| Backend service | Business rules (session exists, response non-empty) | Explicit checks in service functions |
| Backend AI | Tool input (patient_id exists) | Tool returns error string if file missing |
| Frontend API client | HTTP status, response parsing | `response.ok` check, JSON parse error handling |
| Frontend hook | User input (non-empty, not loading) | Guard clauses in `sendMessage` |

## Naming conventions

| Context | Convention | Examples |
|---------|-----------|----------|
| Python variables and functions | `snake_case` | `chat_id`, `process_message` |
| Python classes | `PascalCase` | `ChatRequest`, `Settings` |
| Python constants | `UPPER_SNAKE_CASE` | `MEDICAL_SYSTEM_PROMPT_TEMPLATE` |
| TypeScript interfaces | `PascalCase` | `Message`, `ChatResponse` |
| TypeScript variables and functions | `camelCase` | `chatId`, `sendMessage` |
| React components | `PascalCase` | `ChatPage`, `MessageList` |
| Frontend styling | MUI `sx` / theme tokens | `sx={{ display: "flex", alignItems: "center", gap: 1 }}` |
| File names (Python) | `snake_case.py` | `chat.py`, `graph.py` |
| File names (TypeScript) | `camelCase.ts` or `PascalCase.tsx` | `chat.ts`, `ChatPage.tsx` |
| Patient files | `patient_<first>_<last>.md` | `patient_john_doe.md` |
| Plan files | `PLAN_<SLUG>.md` | `PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md` |

## Documentation maintenance

When you make a code change, update the relevant doc:

| Change type | Update |
|-------------|--------|
| New/changed API endpoint | `docs/FRONTEND_BACKEND_COLLABORATION.md` |
| Architecture change | `docs/ARCHITECTURE.md` |
| New backend module/file | `backend/CLAUDE.md` folder map |
| New frontend component/hook | `frontend/CLAUDE.md` folder map |
| New test file | `docs/TESTING.md` test files table |
| New environment variable | `docs/LOCAL_DEVELOPMENT.md` env table |
| New plan | `docs/README.md` plans table |

If you're unsure which doc to update, check [`docs/DOCUMENTATION_MAP.md`](DOCUMENTATION_MAP.md) for the single-source-of-truth table.
