# Delete a git worktree (sibling folder)

The user wants to remove a worktree that was created with the create-worktree command (sibling directory `../<feature-branch-name>`).

## Input

They pass **one argument**: `<feature-branch-name>` — same name as the branch and folder used when the worktree was added.

If they did not provide a branch name, ask for it before running any git commands.

## Steps (run in order from the repository root)

1. Show registered worktrees (optional sanity check):

   ```bash
   git worktree list
   ```

2. Remove the worktree at the sibling path. From the **main clone** (this repo root):

   ```bash
   git worktree remove ../<feature-branch-name>
   ```

   Replace `<feature-branch-name>` with the actual branch/folder name.

   If Git refuses because of **uncommitted changes** or **untracked files** in that worktree, and the user wants to discard them, use:

   ```bash
   git worktree remove --force ../<feature-branch-name>
   ```

3. If something still looks wrong (stale registration after a manual folder delete), clean up:

   ```bash
   git worktree prune
   ```

## Execution environment (required for first-try success)

- The path `../<feature-branch-name>` is **outside** the current project folder. The default command sandbox may **block deleting or modifying** that sibling directory.
- **Run `git worktree remove` (and `prune` if needed) with full / unrestricted permissions** so the sibling directory can be removed. Same rationale as create-worktree: filesystem access next to the repo.
- Do **not** assume failure means “worktree missing” until you have retried with permissions that allow operations outside the workspace.

## Notes

- Run these commands from the **main** repository root (the primary clone), not from inside the worktree you are removing.
- `git worktree remove` unregisters the worktree and **removes the directory** when successful (unless only pruning stale refs).
- Deleting the worktree does **not** delete the branch from `origin`; it only removes the extra checkout. Local branch refs may remain on the main repo if that branch was checked out only in the worktree — that is normal; use `git branch -d <branch>` separately if they want to drop a local branch.
- If the folder was already deleted manually, use `git worktree prune` or `git worktree remove` may need the path that Git still lists in `git worktree list`.

## Execute

Run these shell commands yourself (do not only tell the user to run them).
