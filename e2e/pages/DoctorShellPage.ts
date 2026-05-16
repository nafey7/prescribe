import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Minimal doctor shell POM — only the assertion we need in Phase 1 (doctor
 * login lands inside `/doctor`). Will grow when Phase 6 lands.
 */
export class DoctorShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectAtRoot(): Promise<void> {
    await expect(this.page).toHaveURL(/\/doctor(\/|$)/);
  }
}
