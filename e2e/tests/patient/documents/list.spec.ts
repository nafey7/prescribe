import { test, expect } from "../../../fixtures/patientTest";
import { PatientDocumentsPage } from "../../../pages/PatientDocumentsPage";

test("documents page loads and shows the Upload button", async ({ page }) => {
  const docs = new PatientDocumentsPage(page);
  await docs.open();
  await docs.expectLoaded();

  await expect(docs.uploadButton()).toBeVisible();
});
