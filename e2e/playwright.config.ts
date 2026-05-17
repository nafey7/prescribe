import { defineConfig, devices } from "@playwright/test";
import { PW_BASE_URL } from "./utils/env";

const PATIENT_STATE = "./.auth/patient.json";
const DOCTOR_STATE = "./.auth/doctor.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: PW_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "anonymous",
      testMatch: /.*\.anonymous\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "patient",
      testMatch: /tests\/(auth|patient|common)\/.*\.spec\.ts$/,
      testIgnore: /.*\.anonymous\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: PATIENT_STATE,
      },
      dependencies: ["setup"],
    },
    {
      name: "doctor",
      testMatch: /tests\/doctor\/.*\.spec\.ts$/,
      testIgnore: /.*\.anonymous\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: DOCTOR_STATE,
      },
      dependencies: ["setup"],
    },
  ],
});
