import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect } from "@playwright/test";
import { DOCTOR_USER, PATIENT_USER } from "./seedUsers";
import { createApiClient, type ApiClient } from "../utils/apiClient";

const PATIENT_TOKENS_PATH = path.join(process.cwd(), ".auth", "patient-tokens.json");
const ACCESS_KEY = "prescribe_access_token";
const REFRESH_KEY = "prescribe_refresh_token";

type Fixtures = {
  api: ApiClient;
  apiContext: import("@playwright/test").APIRequestContext;
};

/**
 * Test fixture for authenticated patient specs.
 *
 * Playwright's storageState only captures localStorage, not sessionStorage.
 * This fixture reads the session tokens saved by global.setup.ts and injects
 * them into sessionStorage via addInitScript before every page navigation,
 * so AuthContext sees a valid session on load.
 */
export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    const tokens = JSON.parse(readFileSync(PATIENT_TOKENS_PATH, "utf-8")) as {
      access: string;
      refresh: string;
    };
    await page.addInitScript(
      ({ accessKey, refreshKey, access, refresh }) => {
        sessionStorage.setItem(accessKey, access);
        sessionStorage.setItem(refreshKey, refresh);
      },
      { accessKey: ACCESS_KEY, refreshKey: REFRESH_KEY, access: tokens.access, refresh: tokens.refresh },
    );
    await use(page);
  },
  apiContext: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext();
    try {
      await use(ctx);
    } finally {
      await ctx.dispose();
    }
  },
  api: async ({ apiContext }, use) => {
    await use(createApiClient(apiContext));
  },
});

export { expect, PATIENT_USER, DOCTOR_USER };
