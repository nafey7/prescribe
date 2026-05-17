import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { PrescriptionsPage } from "../../../pages/PrescriptionsPage";

test("doctor can create a new prescription for John and it appears in the list", async ({ page }) => {
  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  await patients.clickPatient("John");
  await expect(page).toHaveURL(/\/doctor\/patients\/.+/, { timeout: 10_000 });

  const patientId = page.url().split("/doctor/patients/")[1]?.split("/")[0] ?? "";
  expect(patientId).toBeTruthy();

  await page.goto(`/doctor/patients/${patientId}/prescriptions`);

  const prescriptions = new PrescriptionsPage(page);
  await prescriptions.expectLoaded();

  // Open the create prescription form.
  await expect(prescriptions.createButton()).toBeVisible({ timeout: 10_000 });
  await prescriptions.createButton().click();

  // Fill in the diagnosis field.
  const diagnosisInput = prescriptions.diagnosisInput();
  await expect(diagnosisInput).toBeVisible({ timeout: 5_000 });
  await diagnosisInput.fill("Hypertension Stage 1");

  // Fill in the medication name field.
  const medicationInput = prescriptions.medicationInput();
  await expect(medicationInput).toBeVisible({ timeout: 5_000 });
  await medicationInput.fill("Amlodipine 5mg");

  // Submit the form.
  const submitButton = page
    .getByRole("button", { name: /save|submit|create|add/i })
    .last();

  await submitButton.click();

  // The new prescription must appear in the list.
  await expect(
    page.getByText("Hypertension Stage 1").or(page.getByText("Amlodipine 5mg")).first()
  ).toBeVisible({ timeout: 10_000 });
});
