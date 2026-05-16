import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, request, test as setup } from "@playwright/test";
import { DOCTOR_USER, PATIENT_USER, type SeedUser } from "./fixtures/seedUsers";
import { createApiClient, type AuthSession } from "./utils/apiClient";
import { PW_BASE_URL } from "./utils/env";
import { waitForHealth } from "./utils/waitForHealth";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(HERE, ".auth");

const PATIENT_STATE = path.join(AUTH_DIR, "patient.json");
const DOCTOR_STATE = path.join(AUTH_DIR, "doctor.json");

/** Keys the frontend reads from `sessionStorage` (see api/authSession.ts). */
const ACCESS_TOKEN_KEY = "prescribe_access_token";
const REFRESH_TOKEN_KEY = "prescribe_refresh_token";

setup("authenticate seed users and write storage state", async ({ browser }) => {
  setup.setTimeout(60_000);
  await waitForHealth();

  await mkdir(AUTH_DIR, { recursive: true });

  await Promise.all([
    persistAuthState(browser, PATIENT_USER, PATIENT_STATE),
    persistAuthState(browser, DOCTOR_USER, DOCTOR_STATE),
  ]);
});

async function persistAuthState(
  browser: import("@playwright/test").Browser,
  user: SeedUser,
  outputPath: string,
): Promise<void> {
  const apiCtx = await request.newContext();
  let session: AuthSession;
  try {
    const api = createApiClient(apiCtx);
    session = await api.login(user.email, user.password);
  } finally {
    await apiCtx.dispose();
  }

  expect(session.access_token).toBeTruthy();
  expect(session.refresh_token).toBeTruthy();
  expect(session.user.role).toBe(user.role);

  // Open a real browser context so the frontend origin owns the seeded
  // sessionStorage entries; `storageState` will then capture them.
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    // about:blank cannot host origin-scoped storage. Navigate to the dev
    // server first; that boots the app, but AuthProvider will short-circuit to
    // "unauthenticated" because nothing is in sessionStorage yet — we just
    // need the origin to exist so we can seed it.
    await page.goto(PW_BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ accessKey, refreshKey, access, refresh }) => {
        sessionStorage.setItem(accessKey, access);
        sessionStorage.setItem(refreshKey, refresh);
      },
      {
        accessKey: ACCESS_TOKEN_KEY,
        refreshKey: REFRESH_TOKEN_KEY,
        access: session.access_token,
        refresh: session.refresh_token,
      },
    );
    await ctx.storageState({ path: outputPath });
  } finally {
    await ctx.close();
  }
}
