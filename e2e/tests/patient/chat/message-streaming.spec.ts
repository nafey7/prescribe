import { test, expect } from "../../../fixtures/patientTest";
import { buildChatStream } from "../../../mocks/sse";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("streaming tokens are rendered in the chat UI", async ({ page }) => {
  await page.route("**/api/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "thinking", status: "Processing your question", phase: "thinking" },
      { type: "token", content: "Hello" },
      { type: "token", content: " there" },
      {
        type: "done",
        chat_id: "chat-123",
        message_id: "msg-456",
        message_type: "text",
      },
    ]);
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  const chat = new PatientChatPage(page);
  await chat.open();
  await chat.expectLoaded();

  await chat.sendMessage("test streaming");

  await expect(page.getByText("Hello there")).toBeVisible({ timeout: 10_000 });
});
