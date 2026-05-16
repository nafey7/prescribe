import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { DOCTOR_USER, PATIENT_USER, type SeedUser } from "../fixtures/seedUsers";
import { PW_BASE_URL } from "../utils/env";
import { waitForHealth } from "../utils/waitForHealth";

// process.cwd() is e2e/ when running via `npm test`
const AUTH_DIR = path.join(process.cwd(), ".auth");
const PATIENT_STATE = path.join(AUTH_DIR, "patient.json");
const DOCTOR_STATE = path.join(AUTH_DIR, "doctor.json");
const PATIENT_TOKENS = path.join(AUTH_DIR, "patient-tokens.json");
const DOCTOR_TOKENS = path.join(AUTH_DIR, "doctor-tokens.json");

const ACCESS_TOKEN_KEY = "prescribe_access_token";
const REFRESH_TOKEN_KEY = "prescribe_refresh_token";

setup("authenticate seed users and write storage state", async ({ browser }) => {
  setup.setTimeout(60_000);
  await waitForHealth();
  await mkdir(AUTH_DIR, { recursive: true });

  await Promise.all([
    loginAndSaveState(browser, PATIENT_USER, PATIENT_STATE, PATIENT_TOKENS, /\/patient(\/|$)/),
    loginAndSaveState(browser, DOCTOR_USER, DOCTOR_STATE, DOCTOR_TOKENS, /\/doctor(\/|$)/),
  ]);
});

async function loginAndSaveState(
  browser: import("@playwright/test").Browser,
  user: SeedUser,
  outputPath: string,
  tokensPath: string,
  successUrl: RegExp,
): Promise<void> {
  const context = await browser.newContext({ baseURL: PW_BASE_URL });
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByTestId("login-email").fill(user.email);
    await page.getByTestId("login-password").fill(user.password);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(successUrl, { timeout: 15_000 });

    // storageState only captures localStorage; save sessionStorage tokens separately
    // so patient/doctor fixtures can inject them via addInitScript.
    const tokens = await page.evaluate(({ ak, rk }) => ({
      access: sessionStorage.getItem(ak) ?? "",
      refresh: sessionStorage.getItem(rk) ?? "",
    }), { ak: ACCESS_TOKEN_KEY, rk: REFRESH_TOKEN_KEY });
    await writeFile(tokensPath, JSON.stringify(tokens), "utf-8");

    await context.storageState({ path: outputPath });
  } finally {
    await context.close();
  }
}
