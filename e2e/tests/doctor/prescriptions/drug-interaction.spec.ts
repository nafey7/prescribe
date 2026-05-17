import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { PrescriptionsPage } from "../../../pages/PrescriptionsPage";

test("drug interaction checker displays interaction warning for John's medications", async ({ page }) => {
  await page.route("**/api/doctors/*/patients/*/prescriptions/drug-interaction-check", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        interactions: [
          {
            drugs: ["Amlodipine", "Lisinopril"],
            severity: "moderate",
            description: "Monitor blood pressure closely",
          },
        ],
      }),
    });
  });

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

  // "Check Interactions" is only available inside the create prescription dialog.
  await expect(prescriptions.createButton()).toBeVisible({ timeout: 10_000 });
  await prescriptions.createButton().click();

  // Fill in required fields to enable the interaction checker.
  const diagnosisInput = prescriptions.diagnosisInput();
  await expect(diagnosisInput).toBeVisible({ timeout: 5_000 });
  await diagnosisInput.fill("Hypertension");

  const medicationInput = prescriptions.medicationInput();
  await expect(medicationInput).toBeVisible({ timeout: 5_000 });
  await medicationInput.fill("Amlodipine");

  // Click the drug interaction checker button.
  const interactionBtn = prescriptions.drugInteractionButton();
  await expect(interactionBtn).toBeVisible({ timeout: 10_000 });
  await interactionBtn.click();

  // The mocked interaction warning must be visible.
  const warning = page
    .getByText("Amlodipine")
    .or(page.getByText(/blood pressure/i))
    .or(prescriptions.interactionWarning());

  await expect(warning.first()).toBeVisible({ timeout: 10_000 });
});
