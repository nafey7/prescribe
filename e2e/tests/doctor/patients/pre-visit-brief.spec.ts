import { test, expect } from "../../../fixtures/doctorTest";
import { DoctorPatientDetailPage } from "../../../pages/DoctorPatientDetailPage";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";

test("doctor generates a source-counted pre-visit brief from a patient overview", async ({ page }) => {
  await page.route("**/api/doctors/*/patients/*/pre-visit-brief", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        summary: "A new CBC and medication order need review.",
        recent_documents: ["CBC uploaded June 20 reports mild anemia."],
        medication_changes: ["Lisinopril 10 mg daily was issued June 18."],
        abnormal_labs: ["Hemoglobin 10.8 g/dL is marked low."],
        unresolved_concerns: ["The anemia finding remains pending review."],
        generated_at: "2026-06-24T12:00:00Z",
        lookback_days: 180,
        evidence: {
          document_count: 1,
          prescription_count: 1,
          finding_count: 1,
          pending_finding_count: 1,
        },
      }),
    });
  });

  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.clickPatient("John");

  const detail = new DoctorPatientDetailPage(page);
  const generate = detail.generateBriefButton();
  await expect(generate).toBeVisible({ timeout: 10_000 });
  await generate.click();

  const brief = detail.brief();
  await expect(brief).toBeVisible();
  await expect(brief.getByText("A new CBC and medication order need review.")).toBeVisible();
  await expect(brief.getByText("Hemoglobin 10.8 g/dL is marked low.")).toBeVisible();
  await expect(brief.getByText("1 pending finding")).toBeVisible();
  await expect(page.getByRole("button", { name: /regenerate brief/i })).toBeVisible();
});
