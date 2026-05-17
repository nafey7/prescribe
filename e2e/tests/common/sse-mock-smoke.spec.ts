// Smoke test: verifies the SSE mock builder wires up with page.route().
// Intercepts the streaming chat endpoint and asserts rendered token text appears.

import { test, expect } from "../../fixtures/patientTest";
import { buildChatStream } from "../../mocks/sse";

test("SSE mock delivers streamed tokens to the chat UI", async ({ page }) => {
  const cannedStream = buildChatStream([
    { type: "thinking", status: "Processing your request...", phase: "thinking" },
    { type: "token", content: "Hello" },
    { type: "token", content: " there" },
    {
      type: "done",
      chat_id: "mock-chat-id",
      message_id: "mock-message-id",
      message_type: "text",
      meal_plan: null,
      fitness_plan: null,
      differential_diagnosis: null,
    },
  ]);

  await page.route("**/api/chat/message/stream", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: cannedStream,
    });
  });

  await page.goto("/patient/chat");

  const input = page.getByRole("textbox");
  await input.fill("test");

  const sendButton = page
    .getByRole("button", { name: /send/i })
    .or(page.locator("button[aria-label*='send' i]"))
    .first();
  await sendButton.click();

  await expect(page.getByText("Hello there")).toBeVisible({ timeout: 10_000 });
});
