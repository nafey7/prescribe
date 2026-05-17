import { test, expect } from "../../../fixtures/doctorTest";
import { buildChatStream } from "../../../mocks/sse";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorChatPage } from "../../../pages/DoctorChatPage";

test("doctor can send a message and streamed tokens appear in the chat UI", async ({ page }) => {
  await page.route("**/api/doctors/*/patients/*/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "thinking", status: "Analyzing patient records", phase: "records" },
      { type: "token", content: "Based on John's history, " },
      { type: "token", content: "I recommend monitoring blood pressure." },
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

  // Navigate to chat — try tab first, fall back to direct URL.
  const chatTab = page.getByRole("tab", { name: /chat/i }).or(page.getByRole("link", { name: /chat/i })).first();
  const chatTabVisible = await chatTab.isVisible().catch(() => false);
  if (chatTabVisible) {
    await chatTab.click();
  } else {
    await page.goto(`/doctor/patients/${patientId}/chat`);
  }

  await expect(page).toHaveURL(/\/doctor\/patients\/.+\/chat/, { timeout: 10_000 });

  const chat = new DoctorChatPage(page);
  await chat.sendMessage("What should I watch for with this patient?");

  await expect(page.getByText(/monitoring blood pressure/i)).toBeVisible({ timeout: 12_000 });
});
