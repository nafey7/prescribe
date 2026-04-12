# Streaming & Thinking Display — Implementation Plan

## Current State

No streaming. The full flow today:

1. Frontend `POST /api/chat/message` → user sees bouncing dots
2. Backend `graph.invoke()` runs the entire LangGraph agent loop (agent → tools → agent) **synchronously**
3. Returns a single JSON blob `{ message, chat_id, message_id }`
4. Frontend replaces dots with the full message

Everything blocks until the entire AI response is generated. For long responses the user stares at dots for 5–15+ seconds.

---

## Goal

Make the chat feel like Claude / ChatGPT:

- **Token streaming** — text appears word-by-word as the model generates it
- **Thinking indicator** — a visible "Thinking…" block while the model reasons or calls tools
- **Zero breakage** — existing `/message` endpoint stays untouched; new `/message/stream` endpoint is additive

---

## SSE Event Protocol

The new endpoint streams Server-Sent Events. Three event types:

```
event: thinking
data: {"status": "Searching patient records..."}

event: token
data: {"content": "Based"}

event: token
data: {"content": " on"}

event: done
data: {"chat_id": "abc-123", "message_id": "msg-456"}
```

If something goes wrong mid-stream:

```
event: error
data: {"detail": "LLM timeout"}
```

---

## Files to Change

### Backend (Python / FastAPI)

| # | File | What changes |
|---|------|--------------|
| 1 | `backend/app/ai/graph.py` | Add `stream_medical_agent()` async generator |
| 2 | `backend/app/service/chat.py` | Add `process_message_stream()` orchestrator |
| 3 | `backend/app/api/chat.py` | Add `POST /message/stream` SSE endpoint |

### Frontend (React / TypeScript)

| # | File | What changes |
|---|------|--------------|
| 4 | `frontend/src/types/chat.ts` | Add `isStreaming` / `isThinking` fields to `Message` |
| 5 | `frontend/src/api/chat.ts` | Add `sendMessageStream()` SSE reader |
| 6 | `frontend/src/hooks/useChat.ts` | Wire streaming into state management |
| 7 | `frontend/src/components/MessageList.tsx` | Thinking indicator component |
| 8 | `frontend/src/components/ChatMessage.tsx` | Streaming cursor (`▍`) while tokens arrive |

---

## Detailed Changes

### 1. `backend/app/ai/graph.py` — Streaming generator

Add an async generator `stream_medical_agent()` alongside the existing `invoke_medical_agent()`.

- Uses LangGraph's `astream_events(version="v2")` on the compiled graph.
- Filters events:
  - `on_tool_start` → yield `thinking` event with tool name / description
  - `on_tool_end` → yield `thinking` event ("Done searching")
  - `on_chat_model_stream` → yield `token` event with the text chunk
- Accumulates the full response text in a buffer and returns it at the end so the caller can persist it.
- Falls back gracefully: if `astream_events` fails, fall back to `astream(stream_mode="messages")`.

Existing `invoke_medical_agent()` is **not modified** — it continues to work for the legacy endpoint.

### 2. `backend/app/service/chat.py` — Streaming orchestrator

Add `process_message_stream()` async generator:

```
1. Create / fetch chat_id and session (same as today)
2. Save user message to MongoDB
3. Yield SSE events from stream_medical_agent()
4. After stream completes, save full assistant message to MongoDB
5. Yield final `done` event with chat_id + message_id
6. On exception, yield `error` event
```

Full message is only persisted **after** streaming completes — no partial saves.

### 3. `backend/app/api/chat.py` — SSE endpoint

```python
from fastapi.responses import StreamingResponse

@router.post("/message/stream")
async def chat_message_stream(request: ChatRequest):
    db = get_database()
    return StreamingResponse(
        process_message_stream(
            message=request.message,
            chat_id=request.chat_id,
            patient_id=request.patient_id,
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
```

Existing `POST /message` endpoint is **unchanged**.

### 4. `frontend/src/types/chat.ts` — Extended Message type

```typescript
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;   // true while tokens are still arriving
  isThinking?: boolean;    // true while model is reasoning / calling tools
  thinkingStatus?: string; // e.g. "Searching patient records..."
}
```

### 5. `frontend/src/api/chat.ts` — SSE stream reader

Add `sendMessageStream()` that:

- Uses native `fetch()` to `POST /chat/message/stream`
- Reads `response.body` via `getReader()` + `TextDecoder`
- Parses SSE lines (`event:` / `data:`)
- Dispatches to callbacks:

```typescript
export async function sendMessageStream(
  message: string,
  patientId: string,
  chatId: string | undefined,
  callbacks: {
    onThinking: (status: string) => void;
    onToken: (token: string) => void;
    onDone: (chatId: string, messageId: string) => void;
    onError: (error: string) => void;
  }
): Promise<void>
```

No new npm dependencies — `fetch` + `ReadableStream` are built into every modern browser.

### 6. `frontend/src/hooks/useChat.ts` — Streaming state

Replace the `apiSendMessage` → `response.json()` flow with `sendMessageStream()`:

- On send: append user message, create a placeholder assistant message with `isThinking: true`
- `onThinking(status)` → update placeholder's `thinkingStatus`
- `onToken(token)` → set `isThinking: false`, append token to `content`, set `isStreaming: true`
- `onDone(chatId)` → set `isStreaming: false`, store `chatId`
- `onError(err)` → show error in the message bubble (same as today)
- `isLoading` remains `true` during the entire process (keeps input disabled)

### 7. `frontend/src/components/MessageList.tsx` — Thinking indicator

Replace the current bouncing-dots `TypingIndicator` with a richer component when `isThinking` is true on the latest assistant message:

```
┌──────────────────────────────┐
│ 🧠  Thinking...              │
│    Searching patient records… │
│    ───── animated pulse ──── │
└──────────────────────────────┘
```

Once tokens start arriving, the thinking block collapses and the streamed text appears.

### 8. `frontend/src/components/ChatMessage.tsx` — Streaming cursor

While `message.isStreaming` is true, append a blinking cursor character (`▍`) after the rendered markdown content. This is the standard ChatGPT / Claude visual cue.

---

## What Does NOT Change

- `POST /message` endpoint — untouched, still works
- MongoDB persistence logic — same writes, just deferred to after stream completes
- LangGraph graph structure, nodes, tools, prompts — all unchanged
- No new pip or npm dependencies required

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `astream_events` with sync graph nodes | Low — LangGraph handles sync→async internally | Test manually; fallback to `astream(stream_mode="messages")` |
| Partial message on stream interruption | Medium — user closes tab mid-stream | Don't save to DB until stream completes; no partial data |
| Vite proxy buffering SSE | Low | `X-Accel-Buffering: no` header + Vite proxies EventStream correctly by default |
| Breaking existing flow | None | New endpoint is purely additive |

---

## Implementation Order

1. Backend: `graph.py` — `stream_medical_agent()`
2. Backend: `service/chat.py` — `process_message_stream()`
3. Backend: `api/chat.py` — SSE endpoint
4. **Test backend** with `curl` to verify SSE events stream correctly
5. Frontend: `types/chat.ts` — type updates
6. Frontend: `api/chat.ts` — `sendMessageStream()`
7. Frontend: `hooks/useChat.ts` — wire streaming
8. Frontend: `MessageList.tsx` + `ChatMessage.tsx` — UI updates
