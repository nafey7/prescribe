# Frontend — CLAUDE.md

React + Vite + Tailwind chat UI for the medical AI chat. Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Folder map

```
frontend/src/
├── App.tsx                  # Root component, renders ChatPage
├── main.tsx                 # React DOM mount
├── index.css                # Tailwind base styles
├── api/
│   └── chat.ts              # API client: sendMessage, sendMessageStream, getChatHistory, getPatients
├── components/
│   ├── ChatPage.tsx          # Main layout: patient selector + message list + input
│   ├── MessageList.tsx       # Renders message bubbles + thinking indicator
│   ├── ChatMessage.tsx       # Single message bubble with markdown rendering
│   ├── ChatInput.tsx         # Text input bar
│   └── PatientSelector.tsx   # Patient dropdown
├── hooks/
│   └── useChat.ts            # Chat state management: messages, streaming, loading, errors
└── types/
    └── chat.ts               # TypeScript interfaces: Message, ChatResponse, Patient
```

## State and data flow

```
PatientSelector → selected patientId
                      ↓
ChatInput → user text → useChat.sendMessage()
                          ↓
                  api/chat.ts sendMessageStream() (SSE)
                          ↓
                  useChat callbacks:
                    onThinking → update placeholder message
                    onToken    → append to content (RAF-buffered)
                    onDone     → finalize, store chatId
                    onError    → display error in message bubble
                          ↓
                  messages state → MessageList → ChatMessage
```

## Key patterns

- **Single hook for chat state:** `useChat(patientId)` owns messages, chatId, loading, and error state. Components consume its return value.
- **SSE streaming by default:** `sendMessageStream` uses native `fetch` + `ReadableStream` to parse SSE events. No EventSource library needed.
- **RAF token buffering:** Tokens are batched in a `requestAnimationFrame` buffer to avoid excessive React re-renders during fast streaming.
- **Markdown rendering:** `ChatMessage` uses `react-markdown` + `remark-gfm` + `@tailwindcss/typography` for rich message display.
- **Streaming cursor:** A blinking `▍` cursor appears while `isStreaming` is true on the latest assistant message.
- **Thinking indicator:** While `isThinking` is true, a "Thinking..." status block is shown before tokens arrive.
- **No global state library:** Local state via `useState` and `useCallback` — the app is small enough that React's built-in state is sufficient.

## Styling

- Tailwind CSS 3 with the typography plugin for markdown content
- No component library — custom components with Tailwind utility classes
- `lucide-react` for icons

## Deep docs

- [API contract and streaming protocol](../docs/FRONTEND_BACKEND_COLLABORATION.md)
- [Testing strategy](../docs/TESTING.md)
- [Code quality conventions](../docs/CODE_QUALITY.md)
