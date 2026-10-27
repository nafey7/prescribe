# e2e

Playwright end-to-end suite for `prescribe`. Drives the real Docker stack.

## Quick start

```bash
docker compose up -d
docker compose exec backend python -m seed   # idempotent
npm --prefix e2e install                     # first time only
npx --prefix e2e playwright install --with-deps chromium  # first time only
npm --prefix e2e run test
```

`PW_PASSWORD` defaults to `DEV_DEFAULT_PASSWORD` from your shell env; the runner fails fast if neither is set.

## Where things live

- `playwright.config.ts` — projects (`setup`, `anonymous`, `patient`, `doctor`), reporters, retries.
- `global.setup.ts` — waits on `/health`, logs each seed role in via the real API, writes `.auth/*.json` storage states (gitignored).
- `fixtures/` — extended `test` / `expect`, seed-user constants. **All specs import from `fixtures/test.ts`, never from `@playwright/test` directly.**
- `pages/` — POM-lite (no inheritance, no business logic).
- `utils/` — env, health wait, typed API client.
- `tests/<domain>/` — specs grouped by domain (`smoke`, `auth`, `patient`).

## Deep docs

See [`../docs/TESTING.md`](../docs/TESTING.md) — *E2E tests (Playwright)* for selector hygiene, data strategy, env vars, and the rules of engagement. The architectural rationale (folder placement, follow-up phases for doctor portal / chat / CI) is in [`../docs/plans/PLAN_playwright-e2e-tests.md`](../docs/plans/PLAN_playwright-e2e-tests.md).
