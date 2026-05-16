import { test, expect, PATIENT_USER } from "../../fixtures/test";
import { LandingPage } from "../../pages/LandingPage";
import { PatientShellPage } from "../../pages/PatientShellPage";

test("patient logs in via the UI and lands on /patient", async ({ page }) => {
  const landing = new LandingPage(page);
  await landing.openLogin();
  await landing.loginAs(PATIENT_USER.email, PATIENT_USER.password);

  await expect(page).toHaveURL(/\/patient(\/|$)/);

  // Authenticated marker — sidebar nav present.
  const shell = new PatientShellPage(page);
  await shell.expectAuthenticatedShell();
});
