import { test, expect } from "../../fixtures/test";
import { fetchFeatureFlags } from "../../utils/featureFlags";

test("doctor self-signup creates account and lands on /doctor", async ({ page, request }) => {
  const flags = await fetchFeatureFlags(request);
  test.skip(!flags.ALLOW_DOCTOR_SELF_SIGNUP, "Doctor self-signup is disabled");

  const email = `e2e-doctor-signup-${Date.now()}@example.test`;
  const password = "TestPass123!";

  await page.goto("/signup");
  await page.getByTestId("auth-tab-signup").click();

  // The signup form should expose a Patient / Doctor toggle.
  const doctorToggle = page.getByRole("button", { name: /doctor/i });
  await expect(doctorToggle).toBeVisible();
  await doctorToggle.click();

  await page.getByTestId("signup-first-name").fill("Dr");
  await page.getByTestId("signup-last-name").fill("Newdoctor");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-confirm-password").fill(password);
  await page.getByTestId("signup-submit").click();

  await expect(page).toHaveURL(/\/doctor(\/|$)/);
});
