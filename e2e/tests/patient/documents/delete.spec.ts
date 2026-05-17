import path from "node:path";
import { test, expect } from "../../../fixtures/patientTest";
import { PatientDocumentsPage } from "../../../pages/PatientDocumentsPage";

const SAMPLE_PDF = path.join(__dirname, "../../../fixtures/files/sample.pdf");

test("deleting an uploaded document removes it from the list", async ({ page }) => {
  // Disable AI suggestions so "Done" appears immediately after upload.
  await page.route("**/api/config/features", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ai_suggestions_enabled: false,
        allow_doctor_self_signup: false,
        auth_relaxed: false,
      }),
    });
  });

  const docs = new PatientDocumentsPage(page);
  await docs.open();
  await docs.expectLoaded();

  // Upload a fresh document so the test controls what it deletes.
  await docs.clickUpload();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await docs.fileInput().setInputFiles(SAMPLE_PDF);

  // Wait for Continue to be enabled (file must be registered in React state).
  await expect(docs.uploadModalSubmit()).toBeEnabled({ timeout: 5_000 });

  // Submit — click "Continue" to start the upload.
  await docs.uploadModalSubmit().click();

  // With AI suggestions disabled, "Done" appears immediately after upload succeeds.
  const doneBtn = dialog.getByRole("button", { name: "Done" });
  await expect(doneBtn).toBeVisible({ timeout: 20_000 });
  await doneBtn.click();
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Wait for the new card to appear.
  await expect(docs.documentCards().first()).toBeVisible();
  const countBefore = await docs.documentCards().count();

  // Accept the native window.confirm() that the delete handler triggers.
  page.on("dialog", (dialog) => void dialog.accept());

  // Click the delete button on the first card.
  const deleteBtn = docs.deleteButtons().first();
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  // Document count should have decreased by one (or the list is empty).
  await expect(async () => {
    const countAfter = await docs.documentCards().count();
    expect(countAfter).toBeLessThan(countBefore);
  }).toPass({ timeout: 10_000 });
});
