# AI Documentation Structure Plan for `prescribe-v2`

## 1. Title & Summary

Establish a Voya-inspired, AI-first Markdown documentation system for `prescribe-v2` so agents and developers can reliably understand project structure, follow existing patterns, and avoid hallucinating missing conventions. Success means `prescribe-v2` has a clear root `CLAUDE.md`, a navigable `docs/` hub, area-specific `CLAUDE.md` files, and aligned Cursor command references that point only to docs that actually exist.

---

## 2. Type & Scope

**Type:** Documentation architecture enhancement

### In scope

- Add a root `CLAUDE.md` as the primary AI navigation file
- Add a `docs/` hub modeled after the useful parts of Voya's structure
- Add area-specific guidance for `backend/`, `frontend/`, and `data/`
- Define where existing plan documents should live going forward
- Fix `.cursor/commands/` references that currently point to non-existent files
- Document architecture, API boundaries, patient-data format, development workflow, testing, and code-quality expectations

### Out of scope

- Implementing all proposed docs in this plan
- Adding non-Markdown automation such as `.cursor/rules/`, hooks, or CI doc linting
- Creating Voya-scale documentation breadth for a much smaller repo
- Moving or rewriting every historical Markdown file in the same change unless needed for the first pass

---

## 3. Baseline

`prescribe-v2` already has a solid root `README.md` plus two implementation plans at the repo root: `PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md` and `STREAMING_PLAN.md`. It also has AI-oriented slash-command docs under `.cursor/commands/`, but no `CLAUDE.md`, no `docs/` directory, no documentation map, and no area-specific guidance files.

The current project structure is simple and well-suited to a layered doc system:

- `backend/` contains FastAPI, LangGraph, MongoDB, and tests
- `frontend/` contains the React/Vite chat UI
- `data/patients/` contains Markdown patient records used as AI context
- `.cursor/commands/` contains planning/review command docs

The biggest current documentation issue is mismatch: `.cursor/commands/create-plan.md` instructs agents to ground work in `CLAUDE.md`, `docs/ARCHITECTURE.md`, and `docs/FRONTEND_BACKEND_COLLABORATION.md`, but none of those files exist in this repository today.

---

## 4. Prior Art & Strategy

### Existing pattern in `Voya/voya`

Voya uses a layered documentation model:

- Root `CLAUDE.md` as the AI entry point
- `docs/DOCUMENTATION_MAP.md` as the master index
- `docs/README.md` as a lightweight docs hub
- Area-specific `CLAUDE.md` files in major subprojects
- Deep topic docs for architecture, collaboration, testing, CI/CD, and workflows
- Folder conventions for grouped plans/proposals

That pattern works well because it gives AI a predictable reading order:

1. Root `CLAUDE.md`
2. Relevant area `CLAUDE.md`
3. Topic-specific docs in `docs/`

### Existing pattern in `prescribe-v2`

`prescribe-v2` currently relies on:

- Root `README.md` for setup and high-level architecture
- Standalone plan docs at repo root
- `.cursor/commands/*.md` for workflow automation
- Patient data Markdown as runtime content, not navigation docs

### Proposed strategy

Do **not** copy Voya's documentation volume. Reuse its **structure**, not its scale.

The right approach for `prescribe-v2` is a **thin but layered** documentation system:

- One strong root `CLAUDE.md`
- One master map in `docs/DOCUMENTATION_MAP.md`
- One small set of deep docs only where this repo truly needs them
- One `CLAUDE.md` per major area (`backend/`, `frontend/`, `data/`)
- One home for planning docs under `docs/plans/`

This is better than either extreme:

- Better than the current flat approach because commands and agents will have reliable anchors
- Better than copying all of Voya because `prescribe-v2` is smaller and would otherwise accumulate stale or redundant docs

---

## 5. Target Architecture

### Documentation flow

```text
Root task starts
  ↓
Read `CLAUDE.md`
  ↓
Choose domain
  ├─ Backend work  → `backend/CLAUDE.md`
  ├─ Frontend work → `frontend/CLAUDE.md`
  ├─ Data work     → `data/CLAUDE.md`
  └─ Cross-stack   → `docs/ARCHITECTURE.md` + `docs/FRONTEND_BACKEND_COLLABORATION.md`
  ↓
Consult deep docs
  ├─ Setup/dev     → `docs/LOCAL_DEVELOPMENT.md`
  ├─ Tests         → `docs/TESTING.md`
  ├─ Data contract → `docs/PATIENT_DATA.md`
  └─ Standards     → `docs/CODE_QUALITY.md`
  ↓
If planning work
  → `docs/plans/`
```

### Structural model

```text
prescribe-v2/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── README.md
│   ├── DOCUMENTATION_MAP.md
│   ├── ARCHITECTURE.md
│   ├── FRONTEND_BACKEND_COLLABORATION.md
│   ├── LOCAL_DEVELOPMENT.md
│   ├── TESTING.md
│   ├── PATIENT_DATA.md
│   ├── CODE_QUALITY.md
│   └── plans/
│       ├── PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md
│       ├── PLAN_STREAMING_AND_THINKING_DISPLAY.md
│       └── PLAN_AI_DOCUMENTATION_STRUCTURE.md
├── backend/
│   └── CLAUDE.md
├── frontend/
│   └── CLAUDE.md
├── data/
│   └── CLAUDE.md
└── .cursor/commands/
    └── create-plan.md
```

### Documentation layering rules

- `README.md` remains the human-facing quick start and project overview
- `CLAUDE.md` becomes the AI-facing entry point
- `docs/DOCUMENTATION_MAP.md` becomes the canonical documentation index
- Area `CLAUDE.md` files stay short and navigational, not encyclopedic
- Deep docs in `docs/` hold durable reference material
- Planning docs move under `docs/plans/` so root stays clean

---

## 6. Directory & File Plan

| Path | Purpose | Status |
|------|---------|--------|
| `CLAUDE.md` | Primary AI navigation file for the whole repo | New |
| `docs/README.md` | Lightweight docs landing page | New |
| `docs/DOCUMENTATION_MAP.md` | Master index with role-based reading paths | New |
| `docs/ARCHITECTURE.md` | Canonical system design and request/data flow | New |
| `docs/FRONTEND_BACKEND_COLLABORATION.md` | API contract, casing, ownership, integration rules | New |
| `docs/LOCAL_DEVELOPMENT.md` | Docker/local setup, commands, troubleshooting | New |
| `docs/TESTING.md` | Test strategy, commands, expectations by layer | New |
| `docs/PATIENT_DATA.md` | Patient Markdown schema, naming, safety rules | New |
| `docs/CODE_QUALITY.md` | Type, validation, layering, and doc-maintenance conventions | New |
| `docs/plans/` | Canonical folder for implementation plans | New |
| `docs/plans/PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md` | Move existing plan into docs hierarchy | Move/rename |
| `docs/plans/PLAN_STREAMING_AND_THINKING_DISPLAY.md` | Move `STREAMING_PLAN.md` into docs hierarchy | Move/rename |
| `backend/CLAUDE.md` | FastAPI/LangGraph/MongoDB navigation and backend rules | New |
| `frontend/CLAUDE.md` | React/Vite chat UI navigation and frontend rules | New |
| `data/CLAUDE.md` | Guidance for patient records and data docs | New |
| `.cursor/commands/create-plan.md` | Align command instructions with real docs | Modify |
| `README.md` | Link to `CLAUDE.md` and docs hub without duplicating deep docs | Modify |

### Recommended content boundaries

#### `CLAUDE.md`

- How to use the repo docs
- Critical don'ts
- Quick start by domain
- Common commands
- Documentation reading order
- Maintenance rule: update docs when behavior changes

#### `docs/DOCUMENTATION_MAP.md`

- Start-here paths by role: backend, frontend, full-stack, planning
- Topic index
- Which file is canonical for which concept
- Known gaps / docs backlog

#### `backend/CLAUDE.md`

- Backend folder map
- Core request flow: API -> service -> repository -> AI graph
- Existing patterns to preserve
- Testing and common commands
- Pointers to `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/CODE_QUALITY.md`

#### `frontend/CLAUDE.md`

- Component/hook/API client structure
- State ownership and request flow
- Markdown rendering, streaming UI, and typing/thinking states
- Pointers to API contract docs and testing docs

#### `data/CLAUDE.md`

- Purpose of sample patient files
- Naming convention for patient records
- Required/optional sections in patient Markdown
- Warning that sample data is educational and should never be treated as real PHI

---

## 7. API / Data

This plan primarily changes documentation layout, but the documentation set should make current contracts explicit and consistent.

### Contracts that should become documented sources of truth

- Chat API endpoints currently described in `README.md` should also be captured in `docs/FRONTEND_BACKEND_COLLABORATION.md`
- Backend request flow and LangGraph/tool flow should be captured in `docs/ARCHITECTURE.md`
- Patient record file format and file naming should be captured in `docs/PATIENT_DATA.md`
- Testing commands and expectations should move from scattered knowledge into `docs/TESTING.md`

### Data and naming conventions to document

- Backend uses `snake_case`
- Frontend TypeScript should explicitly document where it mirrors backend shape versus where it adapts values
- Patient record files should keep the `patient_<first>_<last>.md` convention
- `docs/plans/` should become the default destination for future plan docs

### Command/doc alignment to enforce

- `.cursor/commands/create-plan.md` should reference:
  - `CLAUDE.md`
  - area `CLAUDE.md` files when relevant
  - `docs/ARCHITECTURE.md`
  - `docs/FRONTEND_BACKEND_COLLABORATION.md`
  - `docs/DOCUMENTATION_MAP.md`

Until those paths exist, command docs should not pretend they do.

---

## 8. Edge Cases & Failure Handling

- **Broken references during rollout:** If commands are updated before docs land, agents will still fail. Sequence must create core docs before changing command guidance.
- **Doc duplication:** `README.md` and `CLAUDE.md` must not carry the same deep content. `README.md` should stay concise; `CLAUDE.md` should route readers onward.
- **Docs becoming stale:** Each deep doc must declare its scope so future changes update the right file instead of appending new standalone notes.
- **Plans remaining split across root and `docs/plans/`:** During migration, either move old plans or add clear redirect notes so AI does not treat both copies as canonical.
- **Patient data confusion:** The repo contains Markdown data files that are runtime inputs, not navigation docs. `data/CLAUDE.md` and `docs/PATIENT_DATA.md` must make that distinction explicit.
- **Over-documenting a small repo:** Keep docs thin. If a topic cannot sustain durable guidance, it should stay in `README.md` or `CLAUDE.md` rather than becoming a standalone file.
- **Cross-stack ambiguity:** Streaming, markdown rendering, and API response handling cross the frontend/backend boundary and should live in the collaboration doc, not in disconnected local notes.

---

## 9. Testing Strategy

### Validation of the documentation system

- Manual link audit: every path referenced from `CLAUDE.md`, `docs/README.md`, and `.cursor/commands/create-plan.md` must exist
- Navigation audit: test 3 common prompts and verify a reasonable reading order exists:
  - backend bug
  - frontend enhancement
  - cross-stack feature plan
- Drift audit: confirm no concept has two conflicting "source of truth" docs

### Recommended verification methods

- Use repo search to confirm `CLAUDE.md`, `ARCHITECTURE.md`, and collaboration docs are the only active references in command docs
- Review Markdown files for relative-link correctness after moving plans into `docs/plans/`
- Spot-check that `README.md` and `CLAUDE.md` each serve different audiences

### What must not be flaky

- Link paths in command docs
- Relative links between `CLAUDE.md`, `docs/README.md`, and `docs/DOCUMENTATION_MAP.md`
- Folder names used as AI navigation anchors

---

## 10. Risks & Rollback

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Copying too much of Voya creates stale docs | Medium | Use a smaller initial doc set and expand only when a real need appears |
| Existing plan docs become fragmented during migration | Medium | Move them in one phase and update inbound links immediately |
| Command docs keep referencing missing files | High | Treat command alignment as a required implementation phase, not cleanup |
| `CLAUDE.md` becomes oversized | Medium | Keep root file navigational; push deep details into `docs/` or area guides |
| Runtime data Markdown gets mistaken for process docs | Medium | Separate `data/CLAUDE.md` from `docs/PATIENT_DATA.md` and state their roles clearly |

**Rollback:** This work is documentation-only. Rollback is straightforward: revert the new Markdown files and restore the old command references. No data migration or runtime rollback is required.

---

## 11. Implementation Phases (Detailed)

### Implementation Order Overview

1. Phase 1 — Documentation skeleton and canonical structure
2. Phase 2 — Root AI navigation files
3. Phase 3 — Area-specific `CLAUDE.md` files
4. Phase 4 — Deep technical reference docs
5. Phase 5 — Plan migration and command alignment
6. Phase 6 — Consistency review and navigation validation

---

### Phase 1 — Documentation Skeleton and Canonical Structure

**Goal:** Create the base folder structure and establish where documentation should live so later docs have a stable home.

**Prerequisites:** None.

**Scope:** Create `docs/` and `docs/plans/`; define naming conventions; choose canonical file destinations. Deferred: writing the full content of all deep docs.

**Tasks:**

1. Create `docs/` and `docs/plans/`.
2. Confirm the canonical file list from section 6 and trim anything unnecessary before writing.
3. Decide final naming for the migrated stream plan:
   - recommended: `docs/plans/PLAN_STREAMING_AND_THINKING_DISPLAY.md`
4. Document the structural rules:
   - root `README.md` for quick start
   - root `CLAUDE.md` for AI navigation
   - `docs/DOCUMENTATION_MAP.md` for indexing
   - area `CLAUDE.md` files for local navigation
5. Add this plan to `docs/plans/` as the seed for the new plan hierarchy.

**Deliverables:**

- `docs/` exists
- `docs/plans/` exists
- canonical doc set is agreed and named consistently

**Verification:**

- Open the repo tree and confirm the docs folders exist
- Confirm this plan file sits under `docs/plans/` or note the transitional location if created first elsewhere

**Notes:** This phase is foundational; do not update command docs yet.

---

### Phase 2 — Root AI Navigation Files

**Goal:** Give AI and contributors a reliable repo entry point plus a central map of where to read next.

**Prerequisites:** Phase 1.

**Scope:** Root `CLAUDE.md`, `docs/README.md`, and `docs/DOCUMENTATION_MAP.md`. Deferred: area-level and deep technical docs.

**Tasks:**

1. Write `CLAUDE.md` with:
   - how to use documentation
   - domain routing
   - critical don'ts
   - common commands
   - links to `docs/DOCUMENTATION_MAP.md`
2. Write `docs/README.md` as a short hub rather than a duplicate knowledge base.
3. Write `docs/DOCUMENTATION_MAP.md` with:
   - reading paths for backend, frontend, full-stack, and planning tasks
   - topic index
   - single-source-of-truth notes
   - current known gaps
4. Update `README.md` to link to `CLAUDE.md` and `docs/README.md` without moving detailed setup material out of the README yet.

**Deliverables:**

- Root `CLAUDE.md`
- `docs/README.md`
- `docs/DOCUMENTATION_MAP.md`
- `README.md` updated with links to the new docs layer

**Verification:**

- Open `CLAUDE.md` and confirm it points to real files only
- Confirm `README.md` still works as a standalone quick start
- Verify relative links among the three root docs

**Notes:** Keep the root `CLAUDE.md` short enough to be practical for AI context loading.

---

### Phase 3 — Area-Specific `CLAUDE.md` Files

**Goal:** Add domain-local navigation so tasks can narrow context quickly after reading the root docs.

**Prerequisites:** Phase 2.

**Scope:** `backend/CLAUDE.md`, `frontend/CLAUDE.md`, and `data/CLAUDE.md`. Deferred: any additional package guides unless a real gap appears.

**Tasks:**

1. Write `backend/CLAUDE.md` covering:
   - folder map for `app/api`, `service`, `repository`, `ai`, `database`, `schemas`
   - request flow and where business logic belongs
   - backend test entry points
   - links to architecture, testing, and code-quality docs
2. Write `frontend/CLAUDE.md` covering:
   - component/hook/API client layout
   - chat state flow
   - streaming/markdown rendering ownership
   - links to collaboration and testing docs
3. Write `data/CLAUDE.md` covering:
   - purpose of `data/patients/`
   - sample-data rules
   - links to `docs/PATIENT_DATA.md`
4. Keep all area `CLAUDE.md` files navigational and under roughly one screen of core guidance before deep links.

**Deliverables:**

- `backend/CLAUDE.md`
- `frontend/CLAUDE.md`
- `data/CLAUDE.md`

**Verification:**

- Pick one representative task per area and confirm the reading order is obvious
- Confirm each area file links back to root `CLAUDE.md`

**Notes:** If one of these files starts turning into a large reference doc, split that content into `docs/` instead.

---

### Phase 4 — Deep Technical Reference Docs

**Goal:** Convert the most important project knowledge into durable reference docs that the root and area guides can point to.

**Prerequisites:** Phases 2 and 3.

**Scope:** Core reference docs only: architecture, frontend/backend collaboration, local development, testing, patient data, and code quality. Deferred: extra niche docs unless they prove necessary.

**Tasks:**

1. Write `docs/ARCHITECTURE.md` covering:
   - system overview
   - request/data flow
   - LangGraph flow
   - persistence model
   - where patient files enter the system
2. Write `docs/FRONTEND_BACKEND_COLLABORATION.md` covering:
   - API endpoints and shapes
   - casing boundary
   - frontend/backend ownership of validations and formatting
   - streaming behavior and error handling
3. Write `docs/LOCAL_DEVELOPMENT.md` covering:
   - Docker workflow
   - local backend/frontend commands
   - env configuration
   - common troubleshooting
4. Write `docs/TESTING.md` covering:
   - backend tests
   - frontend tests
   - manual verification for chat flows
   - where new tests should live
5. Write `docs/PATIENT_DATA.md` covering:
   - patient file schema
   - required sections
   - naming conventions
   - educational-data disclaimer
6. Write `docs/CODE_QUALITY.md` covering:
   - layering rules
   - type expectations
   - validation boundaries
   - when docs must be updated alongside code

**Deliverables:**

- `docs/ARCHITECTURE.md`
- `docs/FRONTEND_BACKEND_COLLABORATION.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/TESTING.md`
- `docs/PATIENT_DATA.md`
- `docs/CODE_QUALITY.md`

**Verification:**

- Confirm each deep doc has a clear scope and is linked from either root or area docs
- Confirm no deep doc duplicates large sections of `README.md` verbatim
- Confirm the architecture and collaboration docs reference the current real paths in `backend/` and `frontend/`

**Notes:** This is the phase most likely to drift into over-documentation; keep each doc tightly scoped.

---

### Phase 5 — Plan Migration and Command Alignment

**Goal:** Make existing planning docs and Cursor commands consistent with the new documentation system.

**Prerequisites:** Phases 1-4.

**Scope:** Migrate plan files into `docs/plans/`, update `.cursor/commands/create-plan.md`, and fix inbound links. Deferred: optional cleanup of every other slash-command file unless they also reference broken paths.

**Tasks:**

1. Move `PLAN_MEDICAL_AI_CHAT_PROTOTYPE.md` into `docs/plans/`.
2. Move `STREAMING_PLAN.md` into `docs/plans/` with the normalized name `PLAN_STREAMING_AND_THINKING_DISPLAY.md`.
3. Update any links that still point to the old root-level plan locations.
4. Update `.cursor/commands/create-plan.md` so its investigation guidance matches the new real docs.
5. Audit the rest of `.cursor/commands/*.md` for references to docs that do not exist and fix the obvious mismatches.
6. Optionally leave short redirect stubs at the old plan paths for one transition cycle if preserving existing links matters.

**Deliverables:**

- plan docs grouped under `docs/plans/`
- `.cursor/commands/create-plan.md` aligned with reality
- obvious broken doc references removed from command docs

**Verification:**

- Search the repo for references to the old root-level plan paths
- Search the repo for `docs/ARCHITECTURE.md`, `CLAUDE.md`, and `FRONTEND_BACKEND_COLLABORATION.md` references and confirm they all resolve
- Open `.cursor/commands/create-plan.md` and verify the recommended reading order is executable

**Notes:** This phase should happen only after the target docs exist; otherwise commands will still point into gaps.

---

### Phase 6 — Consistency Review and Navigation Validation

**Goal:** Validate that the new doc system works as a navigation aid rather than just a pile of Markdown files.

**Prerequisites:** Phases 1-5.

**Scope:** Cross-link review, duplicate-content review, and task-based navigation validation. Deferred: broader documentation expansion.

**Tasks:**

1. Perform a link and path audit across:
   - `CLAUDE.md`
   - `docs/README.md`
   - `docs/DOCUMENTATION_MAP.md`
   - area `CLAUDE.md` files
   - `.cursor/commands/create-plan.md`
2. Run three navigation simulations:
   - "Fix a backend bug"
   - "Add a frontend chat enhancement"
   - "Create a cross-stack plan"
3. Remove duplicated guidance where two docs now describe the same thing.
4. Add a short "known gaps" section to `docs/DOCUMENTATION_MAP.md` for anything intentionally deferred.
5. Confirm the docs system reflects the actual codebase as of review time, not the original assumptions.

**Deliverables:**

- link-clean documentation graph
- validated reading paths for common tasks
- known gaps documented explicitly instead of silently omitted

**Verification:**

- Repo-wide search finds no obviously broken internal doc references
- Each of the three simulated tasks has a clear starting doc and follow-up doc
- `README.md`, `CLAUDE.md`, area `CLAUDE.md`, and `docs/` each have distinct jobs

**Notes:** This phase is the required final quality gate before treating the documentation system as complete.
