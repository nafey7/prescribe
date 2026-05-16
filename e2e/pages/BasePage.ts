import { expect, type Page } from "@playwright/test";

/**
 * Minimal shared helpers. Intentionally tiny — no abstract class, no
 * inheritance hierarchy. POMs compose by holding a `Page` reference.
 */
export class BasePage {
  constructor(public readonly page: Page) {}

  async goto(pathOrUrl: string): Promise<void> {
    await this.page.goto(pathOrUrl);
  }

  async expectAt(urlRegex: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(urlRegex);
  }
}
