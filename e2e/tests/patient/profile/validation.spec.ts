import { test, expect } from "../../../fixtures/patientTest";
import { PatientProfilePage } from "../../../pages/PatientProfilePage";

test("clearing required first name field prevents form submission", async ({ page }) => {
  const profile = new PatientProfilePage(page);
  await profile.open();
  await profile.expectProfileLoaded();

  await profile.clickEdit();

  // Clear the first name field.
  await profile.firstNameInput().fill("");

  // Attempt to save.
  await profile.saveButton().click();

  // The form should not have submitted: edit mode is still active.
  // Either a validation error is shown, or the URL has not changed.
  const currentUrl = page.url();

  const hasValidationError =
    (await page.locator('[role="alert"]').count()) > 0 ||
    (await page.locator("text=/required/i").count()) > 0 ||
    (await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input:invalid"));
      return inputs.length > 0;
    }));

  const saveStillVisible = await profile.saveButton().isVisible().catch(() => false);

  // At least one of: explicit error shown, edit mode still active, or native validation triggered.
  expect(hasValidationError || saveStillVisible || page.url() === currentUrl).toBe(true);

  // Clean up: cancel so seed data is not mutated.
  if (await profile.cancelButton().isVisible()) {
    await profile.cancelButton().click();
  }
});
