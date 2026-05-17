import { test, expect } from "../../../fixtures/doctorTest";
import { buildChatStream } from "../../../mocks/sse";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorChatPage } from "../../../pages/DoctorChatPage";

test("lab result interpretation tokens are rendered in the doctor chat", async ({ page }) => {
  await page.route("**/api/doctors/*/patients/*/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "token", content: "Lab results interpretation: HbA1c of 7.2% indicates " },
      { type: "token", content: "well-controlled diabetes. Continue current medication." },
      { type: "done", chat_id: "c1", message_id: "m1", message_type: "text" },
    ]);
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  const patients = new DoctorPatientsPage(page);
  await patients.open();
  await patients.expectLoaded();

  await patients.clickPatient("John");
  await expect(page).toHaveURL(/\/doctor\/patients\/.+/, { timeout: 10_000 });

  const patientId = page.url().split("/doctor/patients/")[1]?.split("/")[0] ?? "";
  expect(patientId).toBeTruthy();

  const chatTab = page.getByRole("tab", { name: /chat/i }).or(page.getByRole("link", { name: /chat/i })).first();
  const chatTabVisible = await chatTab.isVisible().catch(() => false);
  if (chatTabVisible) {
    await chatTab.click();
  } else {
    await page.goto(`/doctor/patients/${patientId}/chat`);
  }

  await expect(page).toHaveURL(/\/doctor\/patients\/.+\/chat/, { timeout: 10_000 });

  const chat = new DoctorChatPage(page);
  await chat.sendMessage("Please interpret the latest lab results for this patient.");

  const labContent = page
    .getByText(/HbA1c/i)
    .or(page.getByText(/lab results/i));

  await expect(labContent.first()).toBeVisible({ timeout: 12_000 });
});
