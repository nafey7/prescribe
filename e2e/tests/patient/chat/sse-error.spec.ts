import { test, expect } from "../../../fixtures/patientTest";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("a failed streaming request shows an error state in the chat UI", async ({ page }) => {
  await page.route("**/api/chat/message/stream", (route) => route.abort("failed"));

  // Also abort the non-streaming endpoint in case the app falls back to it.
  await page.route("**/api/chat/message", (route) => route.abort("failed"));

  const chat = new PatientChatPage(page);
  await chat.open();
  await chat.expectLoaded();

  await chat.sendMessage("Will this cause an error?");

  const errorIndicator = page
    .getByRole("alert")
    .or(page.getByText(/error/i))
    .or(page.getByText(/failed/i))
    .or(page.getByText(/sorry/i))
    .or(page.getByText(/something went wrong/i))
    .or(page.getByText(/unable to/i))
    .or(page.getByText(/try again/i));

  await expect(errorIndicator.first()).toBeVisible({ timeout: 10_000 });
});
