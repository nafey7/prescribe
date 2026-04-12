# Testing

Test strategy, commands, and conventions for `prescribe-v2`.

## Backend tests

### Running tests

```bash
# In Docker (recommended — includes MongoDB)
docker compose exec backend python -m pytest tests/ -v

# Locally (requires local MongoDB)
cd backend && python -m pytest tests/ -v
```

### Test files

| File | Coverage |
|------|----------|
| `tests/test_api_chat.py` | API endpoint tests for chat routes |
| `tests/test_tools.py` | Unit tests for `search_patient_records` tool |

### Test framework

- **pytest** with **pytest-asyncio** for async test support
- Tests import app modules directly — no separate test database configuration yet

### Where new backend tests go

- API/endpoint tests → `backend/tests/test_api_<area>.py`
- Service logic tests → `backend/tests/test_service_<area>.py`
- Tool/AI tests → `backend/tests/test_<tool_name>.py`
- Follow existing patterns in `test_api_chat.py` and `test_tools.py`

## Frontend tests

The frontend does not currently have automated tests. The project uses TypeScript for compile-time type checking (`tsc -b` runs as part of `npm run build`).

### Manual verification for chat flows

1. Start the app: `docker compose up --build -d`
2. Open `http://localhost:5173`
3. Select a patient from the dropdown
4. Send a message and verify:
   - Thinking indicator appears
   - Tokens stream in word-by-word
   - Final message renders with Markdown formatting
   - Chat history persists across page interactions
5. Test error handling:
   - Send a message with an invalid patient ID (via API)
   - Stop the backend mid-stream and verify graceful error display

### Future test additions

If adding frontend tests, the recommended stack would be:
- **Vitest** for unit tests (already Vite-based)
- **React Testing Library** for component tests
- **Playwright** for E2E tests (not yet configured)

## Test expectations

- All existing tests must pass before merging changes
- New backend features should include tests in the corresponding `tests/test_*.py` file
- Tests should be deterministic — avoid depending on external API calls or timing
- Mock external services (LLM, MongoDB) where needed to keep tests fast and reliable

## Known gaps

- No frontend unit or component tests
- No E2E / integration tests
- No CI pipeline to enforce test passing
- Backend tests may require a running MongoDB instance
