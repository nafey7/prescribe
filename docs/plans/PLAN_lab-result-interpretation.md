# Lab Result Interpretation

## 1. Title & Summary

When a patient uploads a lab report PDF, the AI interprets key values in the context of that patient's
conditions and medications — not just "your HbA1c is high" but "given your Type 2 diabetes, this
reading suggests your metformin dosage may need reviewing." This feature closes the loop between the
existing document upload + extraction pipeline (which already parses and stores structured lab values)
and the conversational AI (which already has full patient context but has no tool to read the stored
lab data). Success means a patient can upload a lab PDF, tap "Discuss with AI," and receive a
clinically grounded interpretation in the streaming chat UI within one conversation turn.

---

## 2. Type & Scope

**Type:** Feature (backend + frontend, full-stack)

**In scope:**
- New `fetch_lab_results` LangGraph tool that reads stored `lab_result` suggestions from MongoDB
- System prompt additions in both patient and doctor prompt templates guiding the AI to call the tool and cross-reference patient profile
- "Discuss with AI" CTA button on `DocumentCard` for `lab_result` category documents (patient portal)
- URL-param-based chat prefill on `ChatPage` (`?prefill=...&sourceDoc=<document_id>`)
- `_TOOL_THINKING_UI` entry for `fetch_lab_results` ("Fetching lab results...")
- Backend unit tests for the new tool
- Frontend unit tests for URL-param prefill reading

**Out of scope (v1):**
- Doctor portal "Discuss with AI" CTA (same pattern, minimal effort — defer to follow-on)
- A dedicated `_lab_interpretation_payload` SSE event with structured JSON (markdown output is sufficient)
- Trend charts / lab history timeline UI
- Re-running text extraction on demand when no suggestions exist yet
- Editing or annotating individual lab values in the UI

---

## 3. Baseline

The extraction pipeline already runs on every uploaded document and stores structured items in the
`suggestions` collection, including `lab_result` items with `extracted_data: { date, results: [{
name, value, status, reference_range }] }`.

**Key existing files:**
- [backend/app/service/ai_suggestions.py](../../backend/app/service/ai_suggestions.py) — background task that extracts and stores suggestions
- [backend/app/ai/extraction_prompts.py](../../backend/app/ai/extraction_prompts.py) — already targets `name, value, status, reference_range` for lab results
- [backend/app/repository/suggestion.py](../../backend/app/repository/suggestion.py) — `list_suggestions(db, patient_id, category=...)` already supports filtering by category
- [backend/app/ai/tools.py](../../backend/app/ai/tools.py) — `search_patient_records` and `web_search`; uses synchronous `_get_sync_db()` via `lru_cache`
- [backend/app/ai/graph.py](../../backend/app/ai/graph.py) — `TOOLS` list and `_TOOL_THINKING_UI` dict
- [backend/app/ai/prompts.py](../../backend/app/ai/prompts.py) — `MEDICAL_SYSTEM_PROMPT_TEMPLATE` and `DOCTOR_ASSISTANT_PROMPT_TEMPLATE`
- [frontend/src/components/documents/DocumentCard.tsx](../../frontend/src/components/documents/DocumentCard.tsx) — displays document with View / Download / Delete buttons
- [frontend/src/components/ChatPage.tsx](../../frontend/src/components/ChatPage.tsx) — patient chat UI, uses `useChat` hook

**Gap:** The AI has no tool to retrieve the stored lab values. `_format_recent_documents` in `tools.py`
only shows document titles. The suggestions collection is never queried during a chat turn.

---

## 4. Prior Art & Strategy

### Existing pattern considered: re-run extraction at chat time

One alternative is to re-fetch GridFS bytes and re-call the LLM extraction pipeline on demand during
chat. This is rejected because: (a) the data already exists in `suggestions`; (b) it adds latency and
LLM cost per chat turn; (c) it duplicates logic from `ai_suggestions.py`.

### Proposed strategy: new LangGraph tool reads from `suggestions`

Add a `fetch_lab_results` tool that queries `db.suggestions` for `category="lab_result"` items for
the patient (optionally filtered by `document_id`), then formats them as a structured markdown summary
for the LLM. This mirrors the existing `search_patient_records` pattern exactly: same sync MongoDB
client (`_get_sync_db()`), same `@tool` decorator, same return-type (formatted string). The AI
already calls `search_patient_records` to get conditions/medications — adding `fetch_lab_results` to
the TOOLS list lets the AI naturally combine both during a single agent loop.

**Verdict: proposed strategy wins.** Consistent with existing tool architecture, no new storage
patterns, minimal code surface, lowest latency.

---

## 5. Target Architecture

```
                   EXISTING FLOW (unchanged)
Patient uploads lab PDF
        │
        ▼
documents.py → background_task → ai_suggestions.py
        │                            │
        │                    extract_text_from_document()
        │                            │
        │                     LLM extraction
        │                            │
        │                    suggestions collection
        │                   { category: "lab_result",
        │                     extracted_data: { date, results: [...] } }
        │
        │                   NEW FLOW
        ▼
"Discuss with AI" button on DocumentCard (lab_result only)
        │
        ▼
navigate to /patient/chat?prefill=<message>&sourceDoc=<document_id>
        │
        ▼
ChatPage reads URL params → pre-populates ChatInput
        │
User submits
        │
        ▼
sendMessageStream() → POST /api/chat/message/stream
        │
        ▼
LangGraph agent
  ├── search_patient_records(patient_id)  → conditions, medications, allergies
  └── fetch_lab_results(patient_id, document_id)  → structured lab values
        │
        ▼
LLM: cross-references lab values against patient profile
        │
SSE token stream → ChatPage → ChatMessage (markdown rendering)
```

---

## 6. Directory & File Plan

| Path | Purpose | New / Modify |
|------|---------|--------------|
| `backend/app/ai/tools.py` | Add `fetch_lab_results` tool + `_format_lab_results` helper | Modify |
| `backend/app/ai/graph.py` | Add `fetch_lab_results` to `TOOLS` list and `_TOOL_THINKING_UI` | Modify |
| `backend/app/ai/prompts.py` | Add lab interpretation rule to both system prompt templates | Modify |
| `backend/tests/test_lab_tool.py` | Unit tests for `fetch_lab_results` tool | New |
| `frontend/src/components/documents/DocumentCard.tsx` | Add "Discuss with AI" button for `lab_result` category | Modify |
| `frontend/src/components/ChatPage.tsx` | Read `prefill` + `sourceDoc` URL params on mount | Modify |
| `frontend/src/hooks/useChat.ts` | Expose `prefillMessage(text)` or accept initial message prop | Modify |

No new collections, no schema migrations, no new API endpoints.

---

## 7. API / Data

### No new endpoints

The feature routes entirely through the existing chat streaming endpoint:
`POST /api/chat/message/stream` (and non-streaming `/api/chat/message`).

### MongoDB query in `fetch_lab_results`

```python
db.suggestions.find({
    "patient_id": patient_id,       # required
    "category": "lab_result",       # always filtered
    "document_id": document_id,     # optional; omit for all recent
}).sort("created_at", -1).limit(20)
```

This reuses the existing `list_suggestions` query pattern from `repository/suggestion.py` but runs
synchronously (same `_get_sync_db()` client all tools use).

### Formatted tool output (returned to LLM)

```
Lab results on file for this patient:

Document: "CBC + Metabolic Panel" (uploaded 2026-04-15, document_id: abc123)
  - HbA1c: 8.2 % | Reference: <5.7% | ⚠ HIGH
  - Fasting Glucose: 145 mg/dL | Reference: 70–99 mg/dL | ⚠ HIGH
  - Creatinine: 1.1 mg/dL | Reference: 0.74–1.35 mg/dL | Normal

1 lab document found. Always interpret values in the context of the patient's conditions and medications.
```

### Frontend URL convention

`/patient/chat?prefill=<URLEncoded message>&sourceDoc=<document_id>`

- `prefill`: plain-text message pre-populated in `ChatInput`
- `sourceDoc`: document ID; the AI will be guided (via the pre-populated message) to call `fetch_lab_results` with this ID

`ChatPage` reads these with `useSearchParams` on mount, sets the input value, then **does not
auto-send** — the patient reviews the message before submitting. URL params are cleared after reading
so a page refresh does not re-trigger the prefill.

### camelCase / snake_case boundary

URL params use camelCase (`prefill`, `sourceDoc`). Backend data stored with snake_case. No new
API contract crossing the boundary for this feature.

---

## 8. Edge Cases & Failure Handling

- **No lab suggestions yet** (extraction still in progress or failed): `fetch_lab_results` returns
  a plain-text notice: "No lab results have been extracted for this patient yet. If a lab document was
  recently uploaded, try again in a few moments." The AI surfaces this message to the user naturally.
- **Extraction produced no structured results** (scanned image, illegible PDF): Same case as above.
  The tool returns the "no results" notice; the AI can still provide general guidance.
- **`document_id` not found in suggestions** (wrong ID, deleted): Tool returns notice scoped to that
  document. AI falls back to all-patient lab results or explains nothing was found.
- **Sync DB unavailable** (MongoDB down): Follows same pattern as `search_patient_records` — returns
  an error string; the LLM surfaces a user-friendly message.
- **`prefill` URL param too long** (browser limit ~2048 chars): Keep the generated prefill message
  short (≤ 200 chars). Tested in frontend unit test.
- **Race condition: user navigates to chat before extraction completes**: The pre-populated message
  says "Please interpret my labs from [document name]". The AI calls `fetch_lab_results`, gets "no
  results yet", and tells the user to try again shortly. No crash path.
- **Doctor portal**: The `DOCTOR_ASSISTANT_PROMPT_TEMPLATE` will be updated with the same lab
  interpretation rule, so the doctor can also ask the AI to interpret lab results even without the
  frontend CTA (Phase 1 deferred to a follow-on for doctor DocumentCard CTA).
- **Missing `reference_range` or `status` fields**: The formatting helper handles absent fields
  gracefully with fallback strings ("N/A").

---

## 9. Testing Strategy

### Backend (pytest in Docker)

**File:** `backend/tests/test_lab_tool.py`

- `test_fetch_lab_results_returns_formatted_results`: Seed a fake suggestion doc in the test DB;
  verify the tool returns a string containing the test name and value.
- `test_fetch_lab_results_filters_by_document_id`: Two suggestion docs; verify filtering works.
- `test_fetch_lab_results_no_suggestions_returns_notice`: Empty collection; verify the "no results"
  notice is returned (not an exception).
- `test_fetch_lab_results_db_unavailable`: Mock `_get_sync_db()` to raise; verify error string
  returned without exception propagation.

Mock pattern follows `test_api_documents.py`: `@patch("app.ai.tools._get_sync_db")`.

Run: `docker compose exec backend python -m pytest tests/test_lab_tool.py -v`

### Frontend (Vitest)

- `ChatPage.test.tsx`: Mount with `?prefill=Hello&sourceDoc=abc` router state; assert the input
  value is pre-populated; assert URL params are consumed (cleared after mount).
- `DocumentCard.test.tsx`: Render with `doc.category = "lab_result"` and an `onDiscuss` prop; assert
  "Discuss with AI" button is present; render with a non-lab category and assert button is absent.

Run: `docker compose exec frontend npm run test:run`

---

## 10. Risks & Rollback

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Extraction has not run when user taps "Discuss" | Medium | Tool returns graceful "not yet available" notice; AI relays it |
| LLM hallucinates interpretation not grounded in data | Medium | Prompt rules require grounding in tool output; disclaimer in response |
| Sync MongoDB call in tool adds latency to chat turn | Low | Same client/pattern as `search_patient_records`; acceptable for <50ms round-trip |
| `_compiled_graph = None` cache miss after tool list change | Low | Adding to `TOOLS` list forces recompile on next cold start; no stale cache issue |
| URL param injection (user crafts a malicious `prefill`) | Low | `prefill` is only inserted into the input field, never auto-executed; no server-side processing |

**Rollback:** All changes are additive. To revert:
- Remove `fetch_lab_results` from `TOOLS` and `_TOOL_THINKING_UI` in `graph.py`
- Revert tool addition in `tools.py`
- Revert prompt rule additions in `prompts.py`
- Remove "Discuss with AI" button from `DocumentCard`
- Revert URL-param handling in `ChatPage`

No database migrations — rollback requires no data cleanup.

---

## 11. Implementation Phases

### Implementation order overview

1. Phase 1 — Backend Tool: `fetch_lab_results` tool + graph wiring
2. Phase 2 — Prompt Guidance: Lab interpretation rules in both system prompts
3. Phase 3 — Frontend CTA: "Discuss with AI" button on DocumentCard
4. Phase 4 — Frontend Chat Prefill: URL param handling in ChatPage / useChat
5. Phase 5 — Tests & Documentation

---

### Phase 1 — Backend Tool

**Goal:** Add a `fetch_lab_results` LangGraph tool so the AI can retrieve stored lab values from the
`suggestions` collection and include them in its interpretation context.

**Prerequisites:** None.

**Scope:**
- Add `_format_lab_results(suggestions: list[dict]) -> str` helper in `tools.py`
- Add `fetch_lab_results` `@tool`-decorated function in `tools.py`
- Add `fetch_lab_results` to `TOOLS` list in `graph.py`
- Add `"fetch_lab_results": ("Fetching lab results...", "lab_results")` to `_TOOL_THINKING_UI` in `graph.py`
- Deferred: prompt rule additions (Phase 2), frontend changes (Phases 3–4)

**Tasks:**
1. In `backend/app/ai/tools.py`: Add `_format_lab_results(suggestions)` that iterates over suggestion docs, extracts `extracted_data.results`, and produces the formatted string described in §7. Handle absent fields (`reference_range`, `status`, `value`) gracefully with `"N/A"` fallbacks.
2. In `backend/app/ai/tools.py`: Add `fetch_lab_results(patient_id: str, document_id: str = "") -> str` decorated with `@tool`. Body: call `_get_sync_db()`, query `db.suggestions.find({"patient_id": ..., "category": "lab_result", ...}).sort("created_at", -1).limit(20)`, pass results to `_format_lab_results`. Handle empty result set with a notice string. Wrap in try/except following the `search_patient_records` error pattern.
3. In `backend/app/ai/graph.py`: Import `fetch_lab_results` and append it to `TOOLS`. Add its entry to `_TOOL_THINKING_UI`.

**Deliverables:** `tools.py` and `graph.py` modified; `fetch_lab_results` callable by the LangGraph agent.

**Verification:**
```bash
# Start the stack if not running
docker compose up -d

# Confirm tool is registered (no import errors)
docker compose exec backend python -c "from app.ai.graph import TOOLS; print([t.name for t in TOOLS])"
# Expected: [..., 'fetch_lab_results']

# Quick smoke: ask the AI about labs for a patient that has lab suggestions seeded
# (manual curl or chat UI test is sufficient for this phase)
```

---

### Phase 2 — Prompt Guidance

**Goal:** Both system prompt templates instruct the AI to call `fetch_lab_results` when the user
asks about lab results, and to cross-reference those values with the patient's conditions and
medications for contextual interpretation.

**Prerequisites:** Phase 1 (tool must exist in TOOLS before adding prompt instructions for it).

**Scope:**
- `MEDICAL_SYSTEM_PROMPT_TEMPLATE` in `prompts.py` — add a new numbered rule for lab interpretation
- `DOCTOR_ASSISTANT_PROMPT_TEMPLATE` in `prompts.py` — add the same rule
- Deferred: frontend changes (Phases 3–4)

**Tasks:**
1. In `backend/app/ai/prompts.py`, add to `MEDICAL_SYSTEM_PROMPT_TEMPLATE` a new numbered critical rule (after the current rule 5):
   ```
   6. LAB RESULT INTERPRETATION — when the user asks to interpret, explain, or discuss their lab
   results or a specific lab report: (a) call search_patient_records to retrieve conditions,
   medications, and allergies if not already retrieved; (b) call fetch_lab_results with
   patient_id="{patient_id}" (and document_id if the user specifies a particular document) to get
   structured lab values; (c) interpret each flagged or abnormal value in the context of the
   patient's specific conditions and medications — do not give generic "this is high" responses;
   (d) note any values that may interact with current medications or suggest a medication review;
   (e) end with a disclaimer that the interpretation is educational and the patient should discuss
   results with their healthcare provider.
   ```
2. Apply the same rule (adapted for doctor context) to `DOCTOR_ASSISTANT_PROMPT_TEMPLATE`.

**Deliverables:** `prompts.py` modified; both prompt templates include lab interpretation guidance.

**Verification:**
- Manual chat test: patient with seeded lab suggestions asks "Can you interpret my lab results?" — AI
  should call `search_patient_records` then `fetch_lab_results` (visible as "Fetching lab results..." thinking bubble) and produce a contextual response.
- Verify "Analyzing results..." thinking event still fires after `on_tool_end` (existing behavior, not changed).

---

### Phase 3 — Frontend CTA on DocumentCard

**Goal:** A "Discuss with AI" button appears on `DocumentCard` when the document category is
`lab_result`. Clicking it navigates to the patient chat with a pre-populated interpretation request.

**Prerequisites:** Phases 1 and 2 complete (the backend must be able to fulfill the interpretation request).

**Scope:**
- Modify `DocumentCard.tsx` to accept an optional `onDiscuss?: () => void` callback prop
- Render a "Discuss with AI" button (using existing MUI `Button` + `lucide-react` `MessageSquare` icon) only when `onDiscuss` is provided
- Modify `DocumentsPage.tsx` to pass `onDiscuss` for `lab_result` documents, building the prefill message and navigating with React Router's `useNavigate`
- Deferred: `ChatPage` URL param handling (Phase 4)

**Tasks:**
1. In `frontend/src/components/documents/DocumentCard.tsx`:
   - Add `onDiscuss?: () => void` to the `Props` interface
   - Import `MessageSquare` from `lucide-react`
   - In the actions `Stack`, add a `Button` with `startIcon={<MessageSquare size={14} />}` and label "Discuss with AI", rendered only when `onDiscuss` is defined. Place it before the Delete button.
2. In `frontend/src/pages/DocumentsPage.tsx` (or wherever `DocumentCard` is rendered for patients):
   - Import `useNavigate` from `react-router-dom` and `PATHS` from `router/paths.ts`
   - Build `handleDiscuss(doc: DocumentMetadata)`: construct `prefill` text (`"Please interpret my lab results from "${doc.description || doc.filename}"."`), construct URL (`${PATHS.PATIENT_CHAT}?prefill=${encodeURIComponent(prefill)}&sourceDoc=${doc.document_id}`), call `navigate(url)`.
   - Pass `onDiscuss={doc.category === "lab_result" ? () => handleDiscuss(doc) : undefined}` to each `DocumentCard`.

**Deliverables:** `DocumentCard.tsx` and `DocumentsPage.tsx` modified; "Discuss with AI" button visible for lab documents, invisible for others.

**Verification:**
```bash
docker compose up -d
# Open http://localhost:5173/patient/documents
# Upload or locate a lab_result document → button "Discuss with AI" appears
# Verify button is absent on imaging/prescription documents
# Click → lands on /patient/chat?prefill=...&sourceDoc=...  (prefill visible in URL)
```

---

### Phase 4 — Frontend Chat Prefill

**Goal:** `ChatPage` reads `prefill` and `sourceDoc` URL params on mount and pre-populates the chat
input with the interpretation request, ready for the patient to send.

**Prerequisites:** Phase 3 (navigation from DocumentCard must be in place to test end-to-end).

**Scope:**
- Modify `ChatPage.tsx` to read and consume URL search params
- Update `useChat.ts` or `ChatInput` to accept a controlled `initialMessage` or expose a `setInput` imperative handle
- Clear URL params after consuming (no re-trigger on refresh)
- Deferred: doctor portal DocumentCard CTA

**Tasks:**
1. In `frontend/src/components/ChatPage.tsx`:
   - Import `useSearchParams` from `react-router-dom`
   - On mount (`useEffect` with `[]` deps), read `searchParams.get("prefill")` and (optionally) `searchParams.get("sourceDoc")`. If `prefill` is non-empty, call the method/prop that sets the chat input value. Immediately call `setSearchParams({})` to strip the params from the URL (no `replace: true` needed since we want history entry).
2. In `frontend/src/hooks/useChat.ts` (or wherever input state lives):
   - Expose a `setDraftMessage(text: string)` function (or equivalent) that the page can call to pre-populate the input without sending. This must be the same state that `ChatInput` renders.
   - Ensure `useChat` returns this setter so `ChatPage` can call it after reading the URL param.
3. Verify that a URL refresh after the first mount does **not** re-prefill (params already cleared).

**Deliverables:** `ChatPage.tsx` and `useChat.ts` modified; end-to-end flow: upload lab → click "Discuss with AI" → chat input pre-populated → user sends → AI interprets.

**Verification:**
```bash
# Full end-to-end manual test:
# 1. Upload a lab PDF (category: lab_result) — wait ~5s for extraction to complete
# 2. Click "Discuss with AI" on the document card
# 3. Confirm /patient/chat opens with prefill text in the input field (URL params cleared)
# 4. Send the message
# 5. Confirm "Fetching lab results..." thinking bubble appears during agent run
# 6. Confirm AI response references the patient's conditions and medications alongside lab values
# 7. Confirm disclaimer is present at the end of the response
```

---

### Phase 5 — Tests & Documentation

**Goal:** Automated test coverage for the new tool and frontend prefill behavior; documentation
updated to reflect the new feature.

**Prerequisites:** Phases 1–4 complete.

**Scope:**
- Backend pytest tests in `backend/tests/test_lab_tool.py`
- Frontend Vitest tests for `DocumentCard` and `ChatPage` prefill behavior
- Update `docs/ARCHITECTURE.md` §LangGraph tools table
- Update `docs/FRONTEND_BACKEND_COLLABORATION.md` if any API contract is documented

**Tasks:**
1. Create `backend/tests/test_lab_tool.py` with the four test cases listed in §9:
   - `test_fetch_lab_results_returns_formatted_results`
   - `test_fetch_lab_results_filters_by_document_id`
   - `test_fetch_lab_results_no_suggestions_returns_notice`
   - `test_fetch_lab_results_db_unavailable`
   - Mock: `@patch("app.ai.tools._get_sync_db")` per existing test patterns.
2. Add `DocumentCard.test.tsx` (or extend existing component tests) with `onDiscuss` prop tests.
3. Add `ChatPage` URL-param prefill tests (Vitest + `MemoryRouter` with `initialEntries`).
4. Update `docs/ARCHITECTURE.md`: add `fetch_lab_results` to the tools list description.
5. No `FRONTEND_BACKEND_COLLABORATION.md` changes needed (no new endpoints).

**Deliverables:** `backend/tests/test_lab_tool.py` (new), frontend test files updated, `docs/ARCHITECTURE.md` updated.

**Verification:**
```bash
# Backend
docker compose exec backend python -m pytest tests/test_lab_tool.py -v
# All 4 tests should pass

# Frontend
docker compose exec frontend npm run test:run
# No regressions; new tests pass
```

**Notes:** Phases 1–2 (backend only) can be developed and tested independently before touching the
frontend. If you split into two Cursor chats, batch Phases 1–2 in Chat A and Phases 3–5 in Chat B.
