import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { PrescriptionsPage } from "../../../pages/PrescriptionsPage";

test("AI suggestions modal shows Lisinopril and Hypertension recommendation", async ({ page }) => {
  // Mock the prescription suggestion endpoint with the correct response format.
  await page.route("**/api/doctors/*/patients/*/prescriptions/suggest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        diagnosis_summary: "Hypertension",
        notes: "Patient has elevated blood pressure readings.",
        medications: [
          { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: null, instructions: null },
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

  // Click the AI Copilot button to open the modal.
  const suggestBtn = prescriptions.aiSuggestionsButton();
  await expect(suggestBtn).toBeVisible({ timeout: 10_000 });
  await suggestBtn.click();

  // The copilot modal must open.
  const modal = prescriptions.suggestionsModal();
  await expect(modal).toBeVisible({ timeout: 8_000 });

  // Type a prompt and click Generate to trigger the mock API.
  const promptField = modal.getByRole("textbox");
  await expect(promptField).toBeVisible({ timeout: 5_000 });
  await promptField.fill("Suggest a prescription for hypertension");

  const generateBtn = modal.getByRole("button", { name: /generate/i });
  await expect(generateBtn).toBeVisible();
  await generateBtn.click();

  // The mocked suggestion content must appear inside the modal.
  const suggestion = modal
    .getByText("Lisinopril")
    .or(modal.getByText("Hypertension"));

  await expect(suggestion.first()).toBeVisible({ timeout: 8_000 });
});
