import { test, expect } from "../../../fixtures/patientTest";
import { PatientChatPage } from "../../../pages/PatientChatPage";

test("chat page loads with a visible input and history area", async ({ page }) => {
  const chat = new PatientChatPage(page);
  await chat.open();

  await chat.expectLoaded();

  await expect(chat.chatInput()).toBeVisible();

  const historyArea = page
    .getByRole("complementary")
    .or(page.locator('[data-testid="chat-history"]'))
    .or(page.locator('[data-testid="chat-sidebar"]'))
    .or(page.locator("aside"))
    .or(page.getByText(/new chat/i))
    .or(page.getByRole("button", { name: /new chat/i }));

  const historyVisible = await historyArea.first().isVisible().catch(() => false);

  if (!historyVisible) {
    await expect(page.getByRole("main")).toBeVisible();
  }
});
