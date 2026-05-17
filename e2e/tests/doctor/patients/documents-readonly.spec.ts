import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorPatientDetailPage } from "../../../pages/DoctorPatientDetailPage";

test("doctor sees documents section but no upload or delete controls for John", async ({ page }) => {
  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  await patients.clickPatient("John");
  await expect(page).toHaveURL(/\/doctor\/patients\/.+/, { timeout: 10_000 });

  const patientId = page.url().split("/doctor/patients/")[1]?.split("/")[0] ?? "";
  expect(patientId).toBeTruthy();

  const detail = new DoctorPatientDetailPage(page);

  // Navigate to the documents tab or directly to the documents URL.
  const documentsTabVisible = await detail.documentsTab().isVisible().catch(() => false);
  if (documentsTabVisible) {
    await detail.clickDocumentsTab();
  } else {
    await page.goto(`/doctor/patients/${patientId}/documents`);
  }

  await expect(page).toHaveURL(/documents/, { timeout: 10_000 });

  // The documents area must be present (even if empty).
  const documentsArea = page
    .getByRole("region", { name: /documents/i })
    .or(page.getByTestId("documents-section"))
    .or(page.getByText(/documents|no documents|no files/i))
    .first();

  await expect(documentsArea).toBeVisible({ timeout: 10_000 });

  // Upload button must NOT be visible in doctor's read-only view.
  await expect(detail.uploadButton()).not.toBeVisible();

  // Delete button must NOT be visible in doctor's read-only view.
  await expect(detail.deleteButton()).not.toBeVisible();
});
