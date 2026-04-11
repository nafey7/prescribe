# Point deploy/test at main

Use this when you need **local and remote `deploy/test` to match `origin/main` exactly** (same commit as remote main at the time you run the commands).

## Prompt (paste or run as agent instruction)

```text
Align the git branch deploy/test with origin/main:

1. git fetch origin
2. git checkout deploy/test
3. git reset --hard origin/main

This makes the local deploy/test branch point to the same commit as the remote main branch (after fetch). Then update the remote deploy/test to match:

4. git push origin deploy/test --force-with-lease

If push is blocked by hooks and the only failures are unrelated to this branch-alignment change, use: git push origin deploy/test --force-with-lease (fix hook issues if possible; avoid --no-verify unless necessary per team policy).

Do not merge; reset --hard is intentional so deploy/test becomes a fast-forward copy of main’s tip.
```

## Command summary

| Step | Command | Effect |
|------|---------|--------|
| Fetch | `git fetch origin` | Updates remote-tracking refs (`origin/main`, etc.) so “main” means latest on the server. |
| Checkout | `git checkout deploy/test` | Switches to the test deployment branch. |
| Reset | `git reset --hard origin/main` | Moves **local** `deploy/test` to the same commit as **remote** `main` (discards local commits on `deploy/test` that are not on main). |
| Push | `git push origin deploy/test --force` | Overwrites **remote** `deploy/test` so it matches your local `deploy/test` (now equal to `origin/main`). |

**Why `origin/main` not `main`:** After `git fetch`, `origin/main` is the authoritative tip of main on the remote. Resetting to local `main` only works if your local `main` is already up to date.

**`--force-with-lease`** is safer than `--force`: it refuses to push if someone else updated `deploy/test` since your last fetch.
