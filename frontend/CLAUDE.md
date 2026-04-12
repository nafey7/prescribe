# Frontend — CLAUDE.md

React + Vite + Tailwind chat UI for the medical AI chat. Start at the root [`CLAUDE.md`](../CLAUDE.md) for overall orientation.

## Folder map

```
frontend/src/
├── App.tsx                  # PatientProvider + RouterProvider
├── router.tsx               # createBrowserRouter (portal + /public/chat + legacy redirects)
├── main.tsx                 # React DOM mount
├── index.css                # Tailwind + patient shell sidebar (tablet rail) utilities
├── layouts/
│   └── PatientLayout.tsx    # DevIdentityBanner (dev) + Sidebar + Header + Outlet + Footer
├── api/
│   ├── client.ts            # apiFetch / apiRequest + X-Patient-Id from PatientContext
│   ├── chat.ts              # Chat API (uses client; getPatients → GET /patients/for-chat)
│   ├── patients.ts          # Patient profile CRUD + list
│   └── documents.ts         # Document uploads / list (uses client)
├── contexts/
│   └── PatientContext.tsx   # Active patient + localStorage; prefers GET /api/patients, fallback for-chat
├── pages/
│   ├── DashboardPage.tsx    # Medical history (under PatientLayout)
│   ├── DocumentsPage.tsx    # Documents (under PatientLayout)
│   └── ProfilePage.tsx      # Patient profile (route `/profile`)
├── components/
│   ├── ChatPage.tsx         # Public chat at `/public/chat` (DevIdentityBanner in dev; picker when prod)
│   ├── Sidebar.tsx, Header.tsx, Footer.tsx, DevIdentityBanner.tsx
│   ├── DevIdentityBanner.tsx # Dev-only amber bar + PatientSelector (PatientLayout + ChatPage)
│   ├── MessageList.tsx
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── PatientSelector.tsx  # Dropdown (used by DevIdentityBanner)
│   ├── documents/           # UploadModal, DocumentCard, DocumentPreview, CategoryFilter, etc.
│   └── patient/             # Profile form sections (demographics, lists, lifestyle, etc.)
├── hooks/
│   ├── useChat.ts
│   └── useDocuments.ts      # Document list + refresh (DocumentsPage)
└── types/
    ├── chat.ts
    ├── patient.ts           # Profile DTOs (snake_case)
    └── document.ts          # Document uploads (snake_case)
```

## State and data flow

```
PatientContext (picker + localStorage) → currentPatientId → X-Patient-Id on API calls
                      ↓
ChatInput → user text → useChat.sendMessage()
                          ↓
                  api/chat.ts sendMessageStream() via api/client (SSE)
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
- **Patient list and profile:** `PatientProvider` loads the picker list from paginated `GET /api/patients` when rows exist, otherwise `GET /api/patients/for-chat`. `ProfilePage` loads and saves via `GET`/`PUT /api/patients/{id}` (UUID or slug). Chat posts require `X-Patient-Id` (injected by `api/client.ts`).
- **No global state library beyond patient list:** Chat state stays in `useChat`; patient list is shared through context only.

## Dependencies

- **Versioning:** Treat **`package-lock.json`** as the source of truth; commit it whenever `package.json` changes.
- **Docker:** After lockfile changes, sync the container with **`docker compose exec frontend npm ci`** (preferred for reproducibility) or `npm install`. See root [`CLAUDE.md`](../CLAUDE.md) — *Dependency changes in Docker*.

## Styling

- Tailwind CSS 3 with the typography plugin for markdown content
- No component library — custom components with Tailwind utility classes
- `lucide-react` for icons

## Deep docs

- [API contract and streaming protocol](../docs/FRONTEND_BACKEND_COLLABORATION.md)
- [Testing strategy](../docs/TESTING.md)
- [Code quality conventions](../docs/CODE_QUALITY.md)
