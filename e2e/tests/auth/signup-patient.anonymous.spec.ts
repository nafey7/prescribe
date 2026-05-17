import { test, expect } from "../../fixtures/test";
import { PatientShellPage } from "../../pages/PatientShellPage";

test("new patient can sign up and lands on the patient dashboard", async ({ page }) => {
  const email = `e2e-patient-signup-${Date.now()}@e2e-prescribe.dev`;
  const password = "TestPass123!";

  await page.goto("/signup");
  await page.getByTestId("auth-tab-signup").click();

  await page.getByTestId("signup-first-name").fill("Alice");
  await page.getByTestId("signup-last-name").fill("Newpatient");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-confirm-password").fill(password);
  await page.getByTestId("signup-submit").click();

  await expect(page).toHaveURL(/\/patient(\/|$)/);

  const shell = new PatientShellPage(page);
  await shell.expectAuthenticatedShell();
});
