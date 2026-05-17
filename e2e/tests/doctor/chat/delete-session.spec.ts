import { test, expect } from "../../../fixtures/doctorTest";
import { buildChatStream } from "../../../mocks/sse";
import { DoctorPatientsPage } from "../../../pages/DoctorPatientsPage";
import { DoctorChatPage } from "../../../pages/DoctorChatPage";

test("doctor can delete a chat session and it is removed from history", async ({ page }) => {
  await page.route("**/api/doctors/*/patients/*/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "token", content: "Noted." },
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
  await chat.sendMessage("Quick note for deletion test.");

  // Wait for the streamed reply to arrive before attempting deletion.
  await expect(page.getByText("Noted.")).toBeVisible({ timeout: 12_000 });

  // Find and click the delete session button.
  const deleteBtn = chat.deleteSessionButton();
  await expect(deleteBtn).toBeVisible({ timeout: 8_000 });
  await deleteBtn.click();

  // Confirm the deletion dialog if one appears.
  const confirmBtn = chat.confirmDeleteButton();
  const confirmVisible = await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false);
  if (confirmVisible) {
    await confirmBtn.click();
  }

  // The deleted session's message should no longer be visible.
  await expect(page.getByText("Quick note for deletion test.")).not.toBeVisible({ timeout: 8_000 });
});
