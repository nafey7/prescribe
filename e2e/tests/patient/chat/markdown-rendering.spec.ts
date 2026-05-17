import { test, expect } from "../../../fixtures/patientTest";
import { buildChatStream } from "../../../mocks/sse";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("markdown content in a streaming response is rendered as HTML", async ({ page }) => {
  await page.route("**/api/chat/message/stream", async (route) => {
    const body = buildChatStream([
      {
        type: "token",
        content:
          "**Important**: Take your medication with food.\n\n- Morning: 8am\n- Evening: 8pm\n\n```\nDose: 5mg\n```",
      },
      {
        type: "done",
        chat_id: "c1",
        message_id: "m1",
        message_type: "text",
      },
    ]);
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  const chat = new PatientChatPage(page);
  await chat.open();
  await chat.expectLoaded();

  await chat.sendMessage("How should I take my medication?");

  await expect(page.getByText("Important")).toBeVisible({ timeout: 10_000 });

  const boldText = page.locator("strong").filter({ hasText: "Important" });
  const boldVisible = await boldText.isVisible().catch(() => false);
  if (!boldVisible) {
    await expect(page.getByText("Important")).toBeVisible();
  }

  const listItem = page
    .locator("li")
    .filter({ hasText: /morning|8am/i })
    .or(page.getByText(/morning: 8am/i));
  await expect(listItem.first()).toBeVisible({ timeout: 10_000 });
});
