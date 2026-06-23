---
name: "source-command-create-manual-testing-doc"
description: "Build a frontend manual QA doc from explicit PR numbers (gh pr/issue/diff)"
---

# source-command-create-manual-testing-doc

Use this skill when the user asks to run the migrated source command `create-manual-testing-doc`.

## Command Template

# Create manual QA testing document

## Invocation

User runs: **`/create-manual-testing-doc <PR numbers…>`**

The user **supplies one or more PR numbers** (space- or comma-separated). Examples:

- `/create-manual-testing-doc 1234`
- `/create-manual-testing-doc 1234 5678 9012`
- `/create-manual-testing-doc 1234, 5678`

**Do not** infer PRs from a date range, “recent work,” or `gh pr list` filters unless the user explicitly asks for that. The **only** PRs in scope are the numbers the user gives.

Default **author** is **`nafey7`** (for context in the doc header only). If the user names another author, use that instead.

---

## What you must do

### 1. Normalize PR numbers

- Parse the argument list into a **deduped, ordered** list of positive integers.
- If no valid PR numbers are provided, stop and ask the user to supply them.

### 2. For each PR: GitHub-linked issues (background for tests)

**Always** pull linked issues **before** writing test cases so acceptance criteria and product intent inform the manual QA plan.

Use **`gh pr view`** for structured data (includes GitHub-linked issues):

```bash
gh pr view <number> --json closingIssuesReferences,title,body,labels,files,additions,deletions,changedFiles,url
```

- **`closingIssuesReferences`**: for **each** linked issue number, fetch full context:

```bash
gh issue view <issue-number> --json title,body,labels,state,url,number
```

If `closingIssuesReferences` is empty, check the PR **body** for `Fixes #`, `Closes #`, `Refs #`, or bare `#123` references and fetch those issues the same way.

Use issue **title/body** for acceptance criteria and background—synthesize; do not copy issue text verbatim if it duplicates the PR scope.

### 3. For each PR: actual code changes (implementation-backed tests)

```bash
gh pr diff <number>
```

Optionally summarize paths:

```bash
gh pr view <number> --json files
```

Use the diff to derive **specific** UI flows, copy, routes, and edge cases to test—not generic placeholders.

### 4. Include only frontend-manual-QA–relevant PRs

- **Include** PRs that touch **`frontend-v2/`** (or other user-facing frontend paths in this repo) in a way that manual QA can verify in the browser (UI, client-only behavior visible from the app).
- **Exclude** PRs that are **only** backend (`backend_python/`, APIs without a visible UI change), infra, or tooling **unless** there is a clear, testable **frontend** effect (e.g. new API consumed by the SPA with visible behavior).
- When a PR mixes backend and frontend, document **only** what a manual tester can validate **through the frontend**; omit backend-only checks.
- **Do not** duplicate the same scenario across PRs: merge overlapping checks into one place and reference PRs/issues once.

### 5. Deliverable: manual QA document

Produce **one** markdown manual QA document (title and filename sensible, e.g. `manual-qa-pr-1234.md`, `manual-qa-pr-1234-5678.md`, or user-specified).

**Must:**

- Header: repo, list of **PR numbers** in scope, default author (if used), how issues were linked (e.g. `closingIssuesReferences` vs body parsing).
- Table or list of **source PRs** (and **linked issues** actually used for context)—**omit** excluded backend-only PRs with a one-line reason in an appendix if helpful.
- **Test cases**: numbered, **atomic**, **non-redundant**, each traceable to PR/issue/diff behavior.
- Steps: environment (e.g. local/staging URL if known), navigation, inputs, **expected results**.
- Strictly **manual frontend QA** (no redundant “API returns 200” unless visible in UI).

**Must not:**

- Redundant tests, copy-paste issue bodies without synthesis, or backend-only suites.

---

## GitHub CLI notes

Run from the repository root (or pass `--repo owner/name` consistently).

Use **`required_permissions: ['all']`** (or project-standard permissions) when `gh` needs network/auth per [github-operations](github-operations.md).

If `gh search` is used for extras, `gh search prs` with `author:` can error in some environments; prefer **`gh pr view` / `gh issue view`** for the numbered PRs the user gave.
