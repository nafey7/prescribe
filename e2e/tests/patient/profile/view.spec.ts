import { test, expect } from "../../../fixtures/patientTest";
import { PatientProfilePage } from "../../../pages/PatientProfilePage";

test("profile page shows John Doe's demographics and conditions", async ({ page }) => {
  const profile = new PatientProfilePage(page);
  await profile.open();
  await profile.expectProfileLoaded();

  // Demographics section heading is visible.
  await expect(profile.demographicsSection()).toBeVisible();

  // The seeded patient's name appears on the page.
  await expect(page.getByText(/John/i).first()).toBeVisible();

  // Conditions section contains hypertension (rendered as an <input> value in ConditionsEditor).
  await expect(page.locator('input[value*="ypertension"]').first()).toBeVisible();
});
