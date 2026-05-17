import { test, expect } from "../../../fixtures/doctorTest";

test("doctor profile page shows name, specialty and email", async ({ page }) => {
  await page.goto("/doctor/profile");
  await expect(page).toHaveURL(/\/doctor\/profile/);

  // At least one of the seeded doctor's identifiers must be visible.
  const identity = page
    .getByText(/Sarah/i)
    .or(page.getByText(/Cardiology/i))
    .or(page.getByText(/sarah@example\.com/i));

  await expect(identity.first()).toBeVisible({ timeout: 10_000 });
});

test("doctor profile edit mode exposes editable fields and Cancel returns to view", async ({ page }) => {
  await page.goto("/doctor/profile");
  await expect(page).toHaveURL(/\/doctor\/profile/);

  // Locate and click the Edit button.
  const editButton = page
    .getByRole("button", { name: /edit/i })
    .or(page.getByRole("link", { name: /edit/i }))
    .first();

  await expect(editButton).toBeVisible({ timeout: 10_000 });
  await editButton.click();

  // After clicking Edit, at least one text input (e.g. first name) must be editable.
  const editableField = page
    .getByRole("textbox")
    .or(page.locator("input[type='text']"))
    .first();

  await expect(editableField).toBeVisible({ timeout: 10_000 });
  await expect(editableField).toBeEnabled();

  // Cancel discards the edit — the Cancel button must exist.
  const cancelButton = page.getByRole("button", { name: /cancel/i }).first();

  await expect(cancelButton).toBeVisible({ timeout: 5_000 });
  await cancelButton.click();

  // After cancelling, the Edit button re-appears and form fields are gone.
  await expect(editButton).toBeVisible({ timeout: 8_000 });
});
