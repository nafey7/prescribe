import path from "node:path";
import { test, expect } from "../../../fixtures/patientTest";
import { PatientDocumentsPage } from "../../../pages/PatientDocumentsPage";

const SAMPLE_PDF = path.join(__dirname, "../../../fixtures/files/sample.pdf");

test("uploading a document via the modal adds it to the document list", async ({ page }) => {
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

  await docs.clickUpload();

  // Upload dialog should appear.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Set the file on the hidden file input.
  await docs.fileInput().setInputFiles(SAMPLE_PDF);

  // If a category selector exists, pick the first available option.
  // MUI Select is a combobox, not a native <select>, so click to open then pick an option.
  const categorySelect = docs.categorySelect();
  if (await categorySelect.isVisible()) {
    await categorySelect.click();
    await page.getByRole("option").first().click();
  }

  // Wait for Continue to be enabled (file must be registered in React state).
  await expect(docs.uploadModalSubmit()).toBeEnabled({ timeout: 5_000 });

  // Submit — click "Continue" to start the upload.
  await docs.uploadModalSubmit().click();

  // With AI suggestions disabled, "Done" appears immediately after upload succeeds.
  const doneBtn = dialog.getByRole("button", { name: "Done" });
  await expect(doneBtn).toBeVisible({ timeout: 20_000 });
  await doneBtn.click();

  // Dialog should close after a successful upload.
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // At least one document card is now visible.
  await expect(docs.documentCards().first()).toBeVisible();
});
