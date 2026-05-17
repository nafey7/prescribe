import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class PatientChatPage extends BasePage {
  async open(): Promise<void> { await this.goto("/patient/chat"); }

  chatInput() { return this.page.getByRole("textbox"); }
  sendButton() { return this.page.getByRole("button", { name: /send/i }).last(); }
  // Voice input button (aria-label contains "voice input" or "Start voice input")
  voiceButton() { return this.page.getByRole("button", { name: /voice input/i }); }

  // Message bubbles in the conversation
  messageBubbles() { return this.page.locator('[data-testid="message-bubble"]'); }
  // Thinking indicator
  thinkingIndicator() { return this.page.locator('[data-testid="thinking-indicator"], [aria-label*="thinking" i]'); }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/patient\/chat/);
    await expect(this.chatInput()).toBeVisible();
  }

  async sendMessage(text: string): Promise<void> {
    await this.chatInput().fill(text);
    await this.sendButton().click();
  }

  async expectMessageContains(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 10_000 });
  }
}
