import { test, expect } from "../../fixtures/test";
import { PW_PATIENT_EMAIL, PW_PASSWORD } from "../../utils/env";

test("unauthenticated access to deep link preserves returnUrl and restores it after login", async ({
  page,
}) => {
  // Navigate to a protected route without being authenticated.
  await page.goto("/patient/profile");

  // Should redirect with a returnUrl query param.
  await expect(page).toHaveURL(/returnUrl=/);

  // Fill in login credentials and submit.
  await page.getByTestId("login-email").fill(PW_PATIENT_EMAIL);
  await page.getByTestId("login-password").fill(PW_PASSWORD);
  await page.getByTestId("login-submit").click();

  // After login, should land on the originally-requested page.
  await expect(page).toHaveURL(/\/patient\/profile(\/|$)/);
});
