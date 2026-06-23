---
name: "source-command-create-pr"
description: "Create or update a GitHub PR from the current branch against main, using the repo PR template and semantic title rules"
---

# source-command-create-pr

Use this skill when the user asks to run the migrated source command `create-pr`.

## Command Template

# Create PR (current branch → `main`)

Use this when opening or refreshing a pull request for **whatever branch is checked out locally**, compared to **`main`** as the merge base.

## Preconditions

- Work is committed and pushed to `origin` for the current branch (or instruct the user to push before `gh pr create`).
- Default base branch is **`main`**. If the project uses a different default, replace `main` below.

## Steps

1. **Confirm branch and sync comparison ref**

   ```bash
   git branch --show-current
   git fetch origin main
   ```

   Use **`origin/main`** (or `main` after fetch) as the base for diffs and PR creation.

2. **Understand the change set (this branch vs `main`)**

   Inspect what will go into the PR, not guesses:

   ```bash
   git log origin/main..HEAD --oneline
   git diff origin/main...HEAD --stat
   ```

   Optionally sample important files with `git diff origin/main...HEAD -- path/to/file` if needed for Summary / Evidence.

3. **PR title — semantic (required by CI)**

   The workflow `.github/workflows/pr-title.yml` validates the title with [Conventional Commits](https://www.conventionalcommits.org/)-style prefixes. Use one of:

   `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

   Scope is optional. Examples:

   - `feat(backend): add ticket time limit Slack alerts`
   - `fix(frontend): correct itinerary redirect`

   Title must be both:
   - **Semantic** (valid type prefix for CI), and
   - **Accurate** (reflect primary intent of the full PR diff, not a random or placeholder title).

   Choose the type by intent:
   - `feat` = net new user-visible capability
   - `fix` = behavior bug/regression correction
   - `refactor` = structure change without intended behavior change
   - `test`/`docs`/`chore`/etc. for non-feature scopes

   If CI fails with “No release type found in pull request title ...”, update the title immediately:

   ```bash
   gh pr edit <PR_NUMBER> --title "<type(optional-scope): accurate summary>"
   ```

4. **PR body — must follow the repo template**

   Read `.github/PULL_REQUEST_TEMPLATE.md` and produce the **full** body with every section present:

   - **Summary** — concrete, brief (what + why).
   - **Type of Change** — check the right boxes (`[x]`).
   - **Evidence of Changes** — fill the subsection that applies (Chat/AI, Frontend, Backend/API); use “N/A” only where truly not applicable.
   - **Testing** — check boxes honestly; list new tests or commands if useful.
   - **Related Issues** — `Fixes #nnn` / `Relates to #nnn` or leave a short note.
   - **Additional Notes** — rollout, feature flags, migrations, anything reviewers must know.

   Do **not** replace this with a bare bullet list unless those bullets live inside the template sections.

5. **Create or update the PR**

   - If no PR exists for this branch:

     ```bash
     gh pr create --base main --head "$(git branch --show-current)" --title "<semantic title>" --body-file /tmp/pr-body.md
     ```

     Write the composed body to a file (e.g. `/tmp/pr-body.md`) to avoid shell-escaping issues.

   - If a PR already exists:

     ```bash
     gh pr view --json number,url
     gh pr edit <number> --title "<semantic title>" --body-file /tmp/pr-body.md
     ```

   Use `required_permissions: ['network']` or `['all']` for `gh` when the environment blocks API access (see `.cursor/commands/github-operations.md`).

6. **Output**

   Return the PR URL and confirm base is **`main`**, the title is semantic, and the wording accurately matches the PR scope.

## What not to do

- Do not invent file lists or behavior; derive Summary and Evidence from `git diff` / logs.
- Do not skip sections of `.github/PULL_REQUEST_TEMPLATE.md`.
- Do not use a non-semantic PR title that will fail the “Validate PR Title” check.
