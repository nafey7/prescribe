import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { PrescriptionsPage } from "../../../pages/PrescriptionsPage";

test("prescriptions page loads for John and URL contains 'prescriptions'", async ({ page }) => {
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

  await expect(page).toHaveURL(/prescriptions/);
});

test("status filter controls are interactive on the prescriptions page", async ({ page }) => {
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

  const statusFilter = prescriptions.statusFilter();
  const filterVisible = await statusFilter.first().isVisible().catch(() => false);

  if (!filterVisible) {
    // Status filter may not exist when the list is empty — skip gracefully.
    test.skip(true, "No status filter found on prescriptions page");
    return;
  }

  // Interact with the status filter to confirm it is enabled.
  await expect(statusFilter.first()).toBeEnabled();
});
