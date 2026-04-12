# Frontend–Backend Collaboration

API contract, casing conventions, ownership boundaries, and streaming behavior between the React frontend and FastAPI backend.

## API endpoints

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| `POST` | `/api/chat/message` | `ChatRequest` (JSON) | `ChatResponse` (JSON) | Non-streaming message |
| `POST` | `/api/chat/message/stream` | `ChatRequest` (JSON) | SSE stream | Streaming message |
| `GET` | `/api/chat/history/{chat_id}` | — | `ChatHistoryResponse` | Chat history |
| `GET` | `/api/chat/patients` | — | `PatientInfo[]` | Available patients |
| `GET` | `/health` | — | `{ status: "ok" }` | Health check |

## Request/response shapes

### `ChatRequest` (backend Pydantic model)

```python
class ChatRequest(BaseModel):
    message: str       # 1–5000 chars
    chat_id: str | None = None
    patient_id: str = "john_doe"
```

### `ChatResponse`

```python
class ChatResponse(BaseModel):
    message: str
    chat_id: str
    message_id: str
```

### `ChatHistoryResponse`

```python
class ChatHistoryResponse(BaseModel):
    chat_id: str
    messages: list[MessageSchema]  # role, content, timestamp
```

### `PatientInfo`

```python
class PatientInfo(BaseModel):
    id: str    # e.g. "john_doe"
    name: str  # e.g. "John Doe"
    file: str  # e.g. "patient_john_doe.md"
```

### Frontend TypeScript mirrors

```typescript
interface ChatResponse {
  message: string;
  chat_id: string;
  message_id: string;
}

interface Patient {
  id: string;
  name: string;
  file: string;
}
```

## Casing conventions

| Boundary | Convention | Example |
|----------|-----------|---------|
| Backend Python code | `snake_case` | `patient_id`, `chat_id` |
| API JSON payloads | `snake_case` | `{ "patient_id": "john_doe", "chat_id": "..." }` |
| Frontend TypeScript interfaces | `snake_case` (mirrors backend) | `ChatResponse.chat_id` |
| Frontend internal state | `camelCase` | `chatId`, `patientId`, `isLoading` |

The frontend API client (`api/chat.ts`) sends `snake_case` in request bodies and receives `snake_case` in responses. The `useChat` hook maps to `camelCase` for internal React state.

## Streaming protocol (SSE)

The streaming endpoint returns `text/event-stream` with four event types:

```
event: thinking
data: {"status": "Searching patient records..."}

event: token
data: {"content": "Based"}

event: token
data: {"content": " on the patient's records..."}

event: done
data: {"chat_id": "abc-123", "message_id": "msg-456"}

event: error
data: {"detail": "LLM timeout"}
```

### Frontend SSE parsing

`sendMessageStream()` in `api/chat.ts` uses:
- Native `fetch()` with `POST` (not `EventSource`, which only supports GET)
- `response.body.getReader()` + `TextDecoder` for chunk reading
- Manual SSE line parsing (`event:` / `data:` lines)
- Callback dispatch to `onThinking`, `onToken`, `onDone`, `onError`

### Token buffering

The `useChat` hook uses `requestAnimationFrame` to batch token updates, preventing excessive React re-renders during fast streaming.

## Ownership boundaries

| Concern | Owner | Notes |
|---------|-------|-------|
| Request validation | Backend (`ChatRequest` Pydantic) | Max message length, required fields |
| Session management | Backend (`service/chat.py`) | UUID generation, session creation |
| AI invocation | Backend (`ai/graph.py`) | LangGraph agent loop |
| Message persistence | Backend (`repository/chat.py`) | MongoDB writes |
| SSE event format | Backend (`service/chat.py` `_format_sse`) | Event structure |
| SSE parsing | Frontend (`api/chat.ts`) | Stream reading, JSON parsing |
| State management | Frontend (`useChat` hook) | Messages, loading, errors |
| Markdown rendering | Frontend (`ChatMessage` component) | react-markdown + remark-gfm |
| Streaming UX | Frontend (components) | Thinking indicator, cursor, RAF buffering |

## Error handling

| Scenario | Backend behavior | Frontend behavior |
|----------|-----------------|-------------------|
| Invalid request | 422 Validation Error | API client throws, error shown in UI |
| AI service failure (non-streaming) | 503 with `detail` | Error message in chat bubble |
| AI error mid-stream | `error` SSE event | `onError` callback → error in chat bubble |
| Network failure | — | `catch` in `useChat` → error in chat bubble |
| Empty AI response | Fallback message sent | Displayed as normal message |
