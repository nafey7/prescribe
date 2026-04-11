---
description: Regenerate an existing GitHub PR description from the full PR diff, using PULL_REQUEST_TEMPLATE.md (input: PR number)
allowed-tools: Bash(gh:*), Bash(git:*), Read
---

# Update PR description (existing PR, template-aligned)

Use this when an **open PR already exists** but the branch has **new commits** (or the description is stale). The agent **replaces the PR body** with a fresh write-up derived from the **current diff of that PR**, following `.github/PULL_REQUEST_TEMPLATE.md`.

## Required input

- **PR number** (e.g. `591`). If the user does not provide it, ask once before proceeding.

## Steps

1. **Load PR metadata from GitHub**

   ```bash
   gh pr view <PR_NUMBER> --json number,url,title,baseRefName,headRefName,body
   ```

   Record `baseRefName` (usually `main`) and `headRefName` (the branch name). Do not assume `main` without checking.

2. **Fetch refs so the diff matches the remote PR**

   ```bash
   git fetch origin
   ```

   Use the PR’s base and head branch names from step 1. The comparison for “everything in this PR” is:

   ```bash
   git diff "origin/${BASE_REF}...origin/${HEAD_REF}" --stat
   git diff "origin/${BASE_REF}...origin/${HEAD_REF}"
   ```

   Alternatively, for a single canonical patch (matches GitHub’s “Files changed”):

   ```bash
   gh pr diff <PR_NUMBER>
   ```

   Prefer analyzing the **full** diff (entire PR), not only `git diff` from a random local state. If the user’s local branch is behind `origin/${HEAD_REF}`, rely on `origin/${HEAD_REF}` after `git fetch`.

3. **Read the template**

   Read `.github/PULL_REQUEST_TEMPLATE.md` and rebuild the body so **every section** is present and filled from the analyzed diff:

   - **Summary** — What changed and why, reflecting **all** current commits in the PR (not the old description).
   - **Type of Change** — Check the correct boxes (`[x]`) from the files/areas touched.
   - **Evidence of Changes** — Populate the subsection that applies (Chat/AI, Frontend, Backend/API); use **N/A** in unused subsections if the template structure requires it.
   - **Testing** — Check boxes honestly; mention new/updated tests, migrations, or commands seen in the diff.
   - **Related Issues** — If the previous PR body contained `Fixes #` / `Relates to #`, **preserve** those lines unless the user asked to remove or change them. Otherwise leave the placeholder or add links the user provides.
   - **Additional Notes** — Migrations, env vars, ops/rollout, breaking changes, anything reviewers need from the **current** diff.

4. **Do not fabricate**

   Derive bullets, file references, and behavior from the diff and `gh pr view` output. If something is unclear from the patch, say so in **Additional Notes** or keep Summary high-level.

5. **Apply the new description**

   Write the composed Markdown to a temp file and update **body only** (default):

   ```bash
   gh pr edit <PR_NUMBER> --body-file /tmp/pr-body.md
   ```

   **Title:** Do **not** change the PR title unless the user explicitly asks, or title CI is failing and the user asks to fix it.
   When updating title, keep it:
   - **Semantic** (Conventional Commit style type prefix recognized by CI), and
   - **Accurate** to the full PR diff (not a placeholder like PR number only).

   If a title update is required, use:

   ```bash
   gh pr edit <PR_NUMBER> --title "<type(optional-scope): accurate summary>"
   ```

   Allowed semantic types:
   `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

   Use `required_permissions: ['network']` or `['all']` for `gh` when needed (see `.cursor/commands/github-operations.md`).

6. **Output**

   Return the PR URL and a short confirmation that the description was regenerated from the **current** PR diff and matches the template.

## When to use vs `create-pr.md`

| Situation | Command |
|-----------|---------|
| New PR from current branch | `create-pr.md` |
| PR already open; branch gained commits; description outdated | **this file** + PR number |

## What not to do

- Do not leave template sections empty or replace them with a single unlabeled bullet list.
- Do not update the PR title by default; update it only when user-requested (or explicitly requested to fix title CI).
- Do not base the write-up on an old chat summary; use **`gh pr diff`** / **`git diff origin/base...origin/head`** after `git fetch`.
