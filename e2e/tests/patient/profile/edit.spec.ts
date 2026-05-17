import { test, expect } from "../../../fixtures/patientTest";
import { PatientProfilePage } from "../../../pages/PatientProfilePage";

test("profile edit mode enables fields and exposes Save/Cancel controls", async ({ page }) => {
  const profile = new PatientProfilePage(page);
  await profile.open();
  await profile.expectProfileLoaded();

  // Enter edit mode.
  await profile.clickEdit();

  // First name field should now be editable.
  const firstNameInput = profile.firstNameInput();
  await expect(firstNameInput).toBeEnabled();

  // Save and Cancel buttons are visible in edit mode.
  await expect(profile.saveButton()).toBeVisible();
  await expect(profile.cancelButton()).toBeVisible();

  // Cancelling returns to view mode — Edit button re-appears, Save disappears.
  await profile.cancelButton().click();
  await expect(profile.editButton()).toBeVisible();
  await expect(profile.saveButton()).not.toBeVisible();
});
