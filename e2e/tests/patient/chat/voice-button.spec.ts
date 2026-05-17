// Voice input button visibility only — no audio automation.
// This spec asserts the button renders; deep voice-capture coverage
// requires real browser audio harnesses and is explicitly out of scope.

import { test, expect } from "../../../fixtures/patientTest";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("voice input button is visible on the chat page", async ({ page }) => {
  const chat = new PatientChatPage(page);
  await chat.open();
  await chat.expectLoaded();

  const voiceButton = page
    .getByRole("button", { name: /voice input|start voice/i })
    .or(page.locator('[aria-label*="voice" i]'));

  await expect(voiceButton.first()).toBeVisible({ timeout: 10_000 });
});
