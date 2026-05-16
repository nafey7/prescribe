import { expect, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Landing surface (`/`) + the auth pages reached from it (`/login`, `/signup`).
 * In Phase 1 the public nav lets us click into `/login`, where the auth form
 * lives.
 */
export class LandingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto("/");
  }

  async openLogin(): Promise<void> {
    await this.goto("/login");
  }

  emailField() {
    return this.page.getByTestId("login-email");
  }

  passwordField() {
    return this.page.getByTestId("login-password");
  }

  submitButton() {
    return this.page.getByTestId("login-submit");
  }

  errorBanner() {
    return this.page.getByTestId("login-error");
  }

  async loginAs(email: string, password: string): Promise<void> {
    await this.emailField().fill(email);
    await this.passwordField().fill(password);
    await this.submitButton().click();
  }

  async expectLoginError(): Promise<void> {
    await expect(this.errorBanner()).toBeVisible();
  }
}
