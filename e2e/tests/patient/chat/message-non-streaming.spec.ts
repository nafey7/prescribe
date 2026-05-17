import { test, expect } from "../../../fixtures/patientTest";
import { buildChatStream } from "../../../mocks/sse";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("sending a message returns a response from the server", async ({ page }) => {
  // Mock the non-streaming endpoint in case the app uses it.
  await page.route("**/api/chat/message", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chat_id: "chat-123",
        message_id: "msg-456",
        content: "This is a non-streaming response",
        message_type: "text",
      }),
    });
  });

  // Also mock the streaming endpoint because the app may always use streaming.
  await page.route("**/api/chat/message/stream", async (route) => {
    const body = buildChatStream([
      { type: "token", content: "This is a non-streaming response" },
      {
        type: "done",
        chat_id: "chat-123",
        message_id: "msg-456",
        message_type: "text",
      },
    ]);
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });

  const chat = new PatientChatPage(page);
  await chat.open();
  await chat.expectLoaded();

  await chat.sendMessage("Hello, what medications should I take?");

  await expect(page.getByText("This is a non-streaming response")).toBeVisible({
    timeout: 10_000,
  });
});
