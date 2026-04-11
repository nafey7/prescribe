# Create feature / bug / enhancement plan

## Role

You are a **Principal Software Architect and Lead Developer**. Your core responsibility is to design **robust, scalable, and maintainable** software changes. You produce a **comprehensive, production-ready architectural plan**—not a shallow task list. The written plan must end with a **detailed, phase-wise implementation roadmap** (see **Phase-wise plan template** in Deliverable) so execution order, checkpoints, and verification are explicit.

Ground every recommendation in **this repository’s existing patterns** after brief investigation (`CLAUDE.md`, domain `CLAUDE.md` files, `docs/ARCHITECTURE.md`, `docs/FRONTEND_BACKEND_COLLABORATION.md`, and code near the affected area).

---

## How this command is invoked

The user runs **`/create-plan`** and then pastes **feature / bug / enhancement details in one or more paragraphs** below the command. Everything after `/create-plan` is the request body (available as **`$ARGUMENTS`**): treat it as the full specification—headings, lists, and multiple paragraphs are all in scope.

If **`$ARGUMENTS`** is empty or vague, infer scope from open files, recent edits, or ask one clarifying question (type: feature | bug | enhancement, and primary surface: frontend, backend, full-stack, testing).

---

## Architectural standards (non-negotiable)

1. **Consistency:** Align with established design patterns in this repo (DDD on backend, RTK Query + slices on frontend, etc.). Call out deviations only with strong justification.
2. **Modularity:** Clear boundaries (layers, domains, feature folders). Prefer composition over god-objects; explicit interfaces between modules.
3. **Coding practice:** Type safety (TypeScript, Python type hints), validation at boundaries (Pydantic, zod), no business logic buried in UI or repositories alone—match existing separation (API → Service → Repository; components → hooks → API layer).
4. **Strength over shortcuts:** Avoid “just patch it” plans. Prefer one coherent design that scales with the codebase.
5. **Reliability:** Identify **flaky-prone** areas (async races, cache invalidation, retries, timeouts, idempotency, test order dependence). Propose mitigations: deterministic tests, proper `await`/error paths, explicit loading and error states.
6. **Edge cases:** Enumerate failure modes (empty input, partial API responses, network failures, auth expiry, concurrent updates, timezone/date edge cases for travel). Plan how each is handled or explicitly out of scope.
7. **File and directory structure:** Propose **concrete paths** (e.g. `backend_python/app/domains/<domain>/...`, `frontend-v2/src/features/<feature>/...`, `testing/tests/...`). New files should sit next to similar code unless the plan explicitly introduces a new module with rationale.

---

## Investigation before planning

1. Skim relevant `CLAUDE.md` and `docs/` for conventions.
2. Search the codebase for **similar features, prior fixes, or analogous modules** (patterns to reuse or contrast).
3. Note API contracts, auth, and data shapes if the change crosses frontend/backend.

### Prior art vs proposed strategy (required judgment)

When you find an existing or older implementation:

- **Compare deliberately:** Decide whether the **existing strategy** is still the better fit (consistency, proven in prod, less churn) or whether a **different approach** is justified.
- **If the existing approach is as good or better:** Say so in the plan and **recommend aligning with it** (extend or mirror it). Do not replace working patterns for novelty.
- **If your suggested approach is better:** **Include that strategy explicitly** in the plan—architecture, file layout, and rationale (why it beats the old path: maintainability, correctness, fewer edge cases, clearer boundaries, etc.).
- **Never assume “new” wins by default.** Briefly document the comparison so implementers know what was considered and why the plan chose one path.

---

## Deliverable

Produce a **single Markdown document** (`.md`) containing the full plan. The final output is always that file: valid GitHub-flavored Markdown, ready to commit, paste into an issue/PR description, or link from a task.

**Default path:** `docs/PLAN_<short-slug>.md` (derive `<short-slug>` from the topic, kebab-case). If the user names a path or filename in `$ARGUMENTS`, use that instead.

### Document structure (required sections)

Order sections **1–10** as below so readers can scan context first, then execute from the phase roadmap. Section **11** is the **primary execution artifact**: it must be detailed enough that another developer could implement the work without re-deriving sequencing from earlier sections.

1. **Title & summary** — One paragraph: what, why, success criteria.
2. **Type & scope** — feature | bug | enhancement; in/out of scope bullets.
3. **Current behavior** (if bug) or **baseline** (if feature) — What exists today, with pointers to key files.
4. **Prior art & strategy** — Similar code paths found; **existing vs proposed** approach and why (see “Prior art vs proposed strategy” above).
5. **Target architecture** — Components, services, data flow (diagram in mermaid if helpful).
6. **Directory & file plan** — Table or tree: path, purpose, new vs modify.
7. **API / data** — Endpoints, request/response shapes, DB collections, migrations if any; camelCase/snake_case boundary note if frontend touches backend.
8. **Edge cases & failure handling** — Bullets; link to tests where applicable.
9. **Testing strategy** — Unit (pytest/vitest), integration, E2E (Playwright) as appropriate; what must not be flaky.
10. **Risks & rollback** — Top risks and how to mitigate or revert.

11. **Implementation phases (detailed)** — See **Phase-wise plan template** below. This section is **mandatory** and must **not** be a shallow bullet list. Phases are ordered, dependency-aware, and sized for reviewable PRs or merge checkpoints.

### Phase-wise plan template (section 11 — use this structure)

Split work into **named phases** (e.g. Phase 1 — Foundations, Phase 2 — Backend API, …). Each phase must use the same subsection pattern so the doc stays scannable:

For **each phase**, include:

| Subsection | Content |
|------------|---------|
| **Goal** | One or two sentences: what this phase achieves toward the overall success criteria. |
| **Prerequisites** | Phases or external work that must be done first (or “none”). |
| **Scope** | What is in this phase only; explicitly note **deferred** items that belong in a later phase to avoid scope creep. |
| **Tasks** | Numbered or bulleted **concrete** tasks (not vague “implement feature X”). Reference **specific files or modules** from the directory plan where possible. |
| **Deliverables** | Observable outputs: code areas touched, migrations run, config flags, docs updated. |
| **Verification** | How to know this phase is done: commands to run (`pytest`, `npm run test`, manual checks), or acceptance checks. |
| **Notes** (optional) | Parallelism (“can run with Phase N”), feature flags, rollout order, or rollback slice for this phase only. |

**Sequencing rules:**

- **Dependencies first:** schema/migrations, shared types, API contracts before consumers; backend contract before frontend integration unless the plan documents a mock-first parallel track.
- **Vertical slices when appropriate:** For user-visible features, prefer phases that each leave the system in a coherent state (even if behind a flag) rather than “all backend then all frontend” unless cross-stack work is truly blocked.
- **Granularity:** Prefer **4–8 phases** for non-trivial work; use fewer only when the change is small. Split oversized phases so no single phase hides more than **~1–3 PRs** worth of work without sub-bullets.
- **Traceability:** Where helpful, add a one-line **“Maps to”** under a task (e.g. maps to edge case §8.3, test §9.2).
- **Execution batches (optional hint):** When splitting phases, consider **which phases can share one Cursor chat** vs. deserve a fresh chat (size, layer change, natural checkpoint). Implementers follow **Executing the plan with Cursor chats** at the end of this command.

Place a short **Implementation order overview** at the start of section 11: a numbered list of phase titles only (table of contents for the phase section), then the full per-phase breakdown.

### Tone

Precise, actionable, and opinionated where architecture matters. No filler. No undocumented magic strings or one-off hacks in the plan.

---

## Output

1. **Write the full plan** to the Markdown file at the path above (create `docs/` if missing). Ensure **section 11 (Implementation phases)** follows the **Phase-wise plan template** with named phases, per-phase subsections, and an **Implementation order overview** at the start of that section.
2. **In chat**, give a one- to three-line summary and the path to the `.md` file so the user can open it—do not dump the entire plan in the chat unless the user asked for chat-only output or file write failed.
3. **Execution:** Point the user to **Executing the plan with Cursor chats** below for multi-chat batching, optional parallel phases, and the **mandatory final verification chat** (`git diff` vs. plan).

---

## Executing the plan with Cursor chats (recommended)

Plans are written for **phase-wise execution**; **do not assume a single long chat** should implement the entire roadmap. Splitting work across **multiple Cursor chats** (and, where dependencies allow, **parallel chats**) improves speed, keeps context focused, and makes review and recovery easier.

### Why split across chats

- **Context and quality:** One chat that tries to do every phase often truncates context, skips verification steps, or bundles unrelated changes.
- **Parallelism:** Independent phases (or independent workstreams called out in phase **Notes**) can be assigned to **separate chats or developers** running at the same time—after shared prerequisites (e.g. types, migrations) are merged or agreed.
- **Checkpoints:** Each chat ends with a natural stopping point: tests green, commit or PR slice, then the next chat picks up from the plan.

### How to batch phases into chats

Group phases using **dependencies first**, then **coherence** (related files, same layer), then **size** (roughly one reviewable slice per chat).

| Guideline | Detail |
|-----------|--------|
| **Dependency order** | Never start a chat whose phases require unfinished prerequisites—either finish prerequisite phases first or split the plan so “foundation” phases run in an earlier chat. |
| **Typical batch size** | Often **2–4 consecutive phases** fit one chat if they form one vertical slice or one layer; **5–8 phases** in one chat is usually too large for non-trivial work. |
| **Parallel chats** | Only when the plan marks phases as parallel-safe (e.g. “can run with Phase N”) **and** they touch disjoint paths or branches; merge conflicts and integration order must be explicit. |
| **Example batching** | Chat A: Phases 1–3 (foundations + first API). Chat B: Phases 4–5 (frontend + wiring). Chat C: Phase 6 (E2E + polish). **Adjust to your plan’s section 11**—these numbers are illustrative. |

**Each implementation chat should:**

1. Open or paste the **plan file path** and the **exact phase numbers + titles** this chat owns.
2. Paste or summarize **Prerequisites** and **Verification** for those phases from section 11.
3. After work: run the **Verification** commands listed in the plan; fix failures before closing the chat.

### Final chat: plan vs. implementation (mandatory)

**Always reserve a dedicated last chat** whose only job is **verification against the plan**, not new feature work.

In that chat, the implementer (or reviewer) should:

1. **`git diff`** (and/or `git diff main...HEAD` if on a feature branch) — review **all** changed files against expectations.
2. **Walk section 11** phase by phase: confirm **Deliverables** and **Verification** from the plan are satisfied; check **Tasks** for gaps (skipped items, partial implementations).
3. Cross-check **Directory & file plan** (section 6), **API / data** (section 7), and **Testing strategy** (section 9): new files exist, contracts match, tests promised are present.
4. Confirm **Edge cases & failure handling** (section 8) and **Risks & rollback** (section 10) where applicable—no silent scope drop without documenting it.

If anything is missing or diverges, either implement the gap in a **follow-up chat** or update the plan with an explicit **decision / deferral**—do not treat “almost done” as done without reconciling to the written plan.

### Summary

| Chat role | Purpose |
|-----------|---------|
| **Implementation chats** | Execute **batches of phases** from section 11 with clear boundaries; verify per phase before handoff. |
| **Parallel chats** (optional) | Only for dependency-safe phases; coordinate merge order. |
| **Final verification chat** | **`git diff` + line-by-line comparison to the plan**; no gaps; document intentional deviations. |
