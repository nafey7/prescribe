import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorPatientDetailPage } from "../../../pages/DoctorPatientDetailPage";

test("clicking John Doe opens his detail page with demographics and medical history", async ({ page }) => {
  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  await patients.clickPatient("John");

  // URL must change to /doctor/patients/:id
  await expect(page).toHaveURL(/\/doctor\/patients\/.+/, { timeout: 10_000 });

  const patientId = page.url().split("/doctor/patients/")[1]?.split("/")[0] ?? "";
  expect(patientId).toBeTruthy();

  const detail = new DoctorPatientDetailPage(page);
  await detail.expectLoaded(patientId);

  // Patient name must be visible on the detail page.
  await expect(page.getByText(/John/i).first()).toBeVisible({ timeout: 10_000 });

  // Demographics or profile section is present.
  const profileInfo = page
    .getByText(/date of birth|dob|demographics|age|gender/i)
    .or(detail.profileSection());

  await expect(profileInfo.first()).toBeVisible({ timeout: 10_000 });

  // Medical history section — conditions or medications.
  const medicalHistory = page
    .getByText(/conditions|medications|allergies|hypertension/i)
    .first();

  await expect(medicalHistory).toBeVisible({ timeout: 10_000 });
});
