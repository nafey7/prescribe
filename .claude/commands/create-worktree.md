# Create git worktree for a remote branch

The user created a branch on GitHub (web) and wants a local worktree for it.

## Input

They pass **one argument**: `<feature-branch-name>` — the branch name as it exists on `origin` (same name as on GitHub).

If they did not provide a branch name, ask for it before running any git commands.

## Steps (run in order from the repository root)

1. Fetch the latest refs from the remote:

   ```bash
   git fetch origin
   ```

2. Add a worktree in a **sibling directory** of the current repo, named after the branch, and **create a local branch with the same name** tracking the remote tip (avoids detached `HEAD` at `origin/<feature-branch-name>`):

   ```bash
   git worktree add -b <feature-branch-name> ../<feature-branch-name> origin/<feature-branch-name>
   ```

   Replace `<feature-branch-name>` with the actual branch name in **all three** places (local branch name, directory name, and remote ref).

   If Git errors because a **local branch with that name already exists** in this repo (unusual for “branch created on GitHub only”), use instead:

   ```bash
   git worktree add ../<feature-branch-name> <feature-branch-name>
   ```

   (second form: check out the existing local branch in the new worktree).

## Execution environment (required for first-try success)

- The worktree path `../<feature-branch-name>` is **outside** the current project folder. In Cursor, the default command sandbox often **blocks creating or writing** there (`Operation not permitted` on `.git` under the new path).
- **Run the `git worktree add` step with full / unrestricted permissions** (e.g. disable sandbox / “all” permissions) so the sibling directory can be created. `git fetch` may need network access; the worktree step needs **filesystem access outside the workspace**.
- Do **not** treat a failed worktree add as “branch missing” until you have retried with permissions that allow writes next to the repo.

## Notes

- The worktree path `../<feature-branch-name>` is relative to the main clone (parent of the repo folder contains the new worktree folder).
- Using `-b … origin/…` matches the usual case: branch exists on `origin`, no local branch yet, and the user ends on a **named** branch, not detached `HEAD`.
- If `../<feature-branch-name>` already exists or the worktree is already registered, report the git error and suggest fixes (remove stale folder, `git worktree list`, etc.).
- After success, confirm the absolute path and that they can `cd` into it.

## Execute

Run these shell commands yourself (do not only tell the user to run them).
