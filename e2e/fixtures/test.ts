import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { DOCTOR_USER, PATIENT_USER } from "./seedUsers";
import { createApiClient, type ApiClient } from "../utils/apiClient";

type Fixtures = {
  api: ApiClient;
  apiContext: APIRequestContext;
};

/**
 * All specs MUST import `test` / `expect` from this file (not directly from
 * `@playwright/test`) so they receive the suite's shared fixtures.
 */
export const test = base.extend<Fixtures>({
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
