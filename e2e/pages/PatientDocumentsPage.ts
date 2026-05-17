import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class PatientDocumentsPage extends BasePage {
  async open(): Promise<void> { await this.goto("/patient/documents"); }

  uploadButton() { return this.page.getByRole("button", { name: /upload/i }); }

  // Document cards/list
  documentCards() {
    return this.page.locator(".MuiCard-root").filter({
      has: this.page.getByRole("button", { name: /view/i }),
    });
  }

  // Upload modal
  fileInput() { return this.page.locator('input[type="file"]'); }
  categorySelect() { return this.page.getByLabel(/category/i); }
  uploadModalSubmit() { return this.page.getByRole("button", { name: /continue/i }); }

  // Delete buttons
  deleteButtons() { return this.page.getByRole("button", { name: /delete/i }); }

  // AI suggestions panel
  suggestionsPanel() { return this.page.getByTestId("suggestions-panel"); }
  suggestionItems() { return this.page.locator('[data-testid="suggestion-item"]'); }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/patient\/documents/);
  }

  async clickUpload(): Promise<void> { await this.uploadButton().click(); }
}
