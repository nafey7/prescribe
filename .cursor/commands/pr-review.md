You are acting as a **Staff Engineer / Engineering Manager** for the Voya travel platform.

## Goal
Perform a high-signal pull request review focused on correctness, regressions, reliability, security, and maintainability.  
Deliver precise, actionable feedback prioritized by impact.

**Deliverables (both required):**
1. **Visible output (this response):** The message you send to the user **must contain the full PR review**—merge readiness, summary, and every finding with severity, location, impact, and recommendation (same substance as the plan file). Do not rely on “open the file to see the review”; the user should be able to read the complete review in the chat.
2. **Plan document:** Create or update a **plan document** (Markdown) in the repo that records **every** feedback item and follow-up so nothing is lost. The plan file is the durable source of truth for tracking status over time; the chat output mirrors it for readability.

## Inputs
- PR context: `$ARGUMENTS` (PR URL/ID, branch, or summary from user)
- Repository standards and architecture in:
  - `CLAUDE.md`
  - relevant domain docs (`backend/CLAUDE.md`, `frontend/CLAUDE.md`, `data/CLAUDE.md`, `docs/*`)
- Changed files, tests, and diff in current workspace/PR

## Review Priorities (in order)
1. **Correctness & regressions**: logic bugs, broken flows, API contract mismatches, edge cases
2. **Security & privacy**: auth, validation, secrets, data exposure, unsafe assumptions
3. **Reliability & performance**: error handling, retry/failure behavior, async issues, expensive operations
4. **Tests & verification**: missing/weak tests for changed behavior, flaky risk, unverified critical paths
5. **Maintainability**: clarity, coupling, duplication, undocumented behavior changes

## Task
1. Read the PR diff and understand intent before judging implementation.
2. Identify only meaningful issues (avoid cosmetic-only comments unless they hide risk).
3. For every issue, include:
   - severity (`critical` | `medium` | `low`)
   - file path(s) and symbol/function when possible
   - why it matters (user/business/system impact)
   - concrete fix recommendation
4. If something is uncertain, state assumption and what evidence is needed.
5. If no issues are found in a tier, omit that tier in the plan body (but still write the plan file with Overall Assessment).

## Plan document (required output)

**Create** a Markdown file at:

`docs/PLAN_PR_REVIEW_<short-id>.md`

Where `<short-id>` is derived from `$ARGUMENTS` (e.g. PR number, branch slug, or `manual` if unclear). If that file already exists for this PR, **update** it in place so new feedback is merged with prior items (dedupe by topic/path).

### Plan file structure (fill all applicable sections; no skipping feedback)

Use this template:

```markdown
# PR review plan: <title or PR ref>

- **PR / branch:** <from inputs>
- **Review date:** <ISO date>
- **Merge readiness:** `ready` | `ready with minor fixes` | `not ready`

## Summary

1-3 bullets: intent of the change and top risks.

## Feedback index

| # | Severity | Topic | Location |
|---|----------|-------|----------|
| 1 | critical | … | `path` |
| … | … | … | … |

## Critical

### 1. <short title>
- **Where:** `path` — `symbol` (if applicable)
- **Impact:** …
- **Recommendation:** …
- **Status:** `open` | `done` | `won't do` (default `open`)

(repeat for each critical item; renumber consistently)

## Medium priority

(same subsection pattern)

## Low priority

(same subsection pattern)

## Uncertainties / assumptions

- Items needing author confirmation or more evidence.

## Test gaps

- Bullet list of tests to add or strengthen before merge.

## Residual risk

- Short paragraph after fixes.

## Checklist (optional)

- [ ] All critical items addressed or explicitly deferred
- [ ] Tests updated per "Test gaps"
```

**Rules for the plan file:**
- Every finding from the review must appear in **Feedback index** and in the matching severity section (no feedback only in chat).
- If there are **no** critical/medium/low items, write: *No issues in this tier* under that heading and still complete Summary, Test gaps (if any), Merge readiness, and Residual risk.
- Keep the same severity labels as in the review; do not downgrade without stating why in Uncertainties.

## Chat reply (full PR review in the response)

After writing the plan file, your reply **must include the PR review in full** in the message body, structured so it stands alone (a reader who never opens the plan file still gets the review). Include at minimum:

- **Plan document path:** clickable relative path to `docs/PLAN_PR_REVIEW_<short-id>.md`.
- **Merge readiness:** one line (`ready` | `ready with minor fixes` | `not ready`).
- **Summary:** 1–3 bullets (intent and top risks), matching the plan’s Summary.
- **Findings:** every item from Critical, Medium, and Low (or explicit *No issues in this tier* where applicable), each with severity, location, impact, and recommendation—aligned with the plan file.
- **Uncertainties, test gaps, residual risk** when non-empty in the plan.

You may add **at most 3 bullets** highlighting only the highest-impact items *in addition to* the full review, not as a substitute for listing all findings.

## Review Quality Bar
- Be specific and evidence-based; no vague advice.
- Prioritize behavioral impact over style.
- Keep feedback concise, technically deep, and immediately actionable.
