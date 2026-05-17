import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DoctorChatPage extends BasePage {
  chatInput() { return this.page.getByRole("textbox"); }
  sendButton() { return this.page.getByRole("button", { name: /send/i }).last(); }

  async sendMessage(text: string): Promise<void> {
    await this.chatInput().fill(text);
    await this.sendButton().click();
  }

  async expectMessageContains(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 10_000 });
  }

  deleteSessionButton() { return this.page.getByRole("button", { name: /delete.*session|delete.*chat/i }).first(); }
  confirmDeleteButton() { return this.page.getByRole("button", { name: /confirm|yes|delete/i }).last(); }
}
