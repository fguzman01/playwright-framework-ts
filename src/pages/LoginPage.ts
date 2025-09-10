import { Page, expect } from '@playwright/test';
import { safeFill, safeClick, safeGoto, waitElement } from '../utils/webUtils';

export class LoginPage {
  constructor(private readonly page: Page) {}

  // Selectores
  private readonly usernameSelector = '[data-test="username"]';
  private readonly passwordSelector = '[data-test="password"]';
  private readonly loginButtonSelector = '[data-test="login-button"]';
  private readonly inventoryContainerSelector = '[data-test="inventory-container"]';
  private readonly errorSelector = '[data-test="error"]';

  /**
   * Navega a la página de login de SauceDemo.
   */
  async goto(): Promise<void> {
    await safeGoto(this.page, 'https://www.saucedemo.com/', { log: 'all', logLabel: 'goto-login' });
  }

  /**
   * Acciones atómicas (micro-métodos)
   */
  async fillUsername(username: string): Promise<void> {
    await waitElement(this.page, this.usernameSelector, { state: 'visible', expectEnabled: true, log: 'all', logLabel: 'username' });
    await safeFill(this.page, this.usernameSelector, username, { clear: true, log: 'all', logLabel: 'username' });
  }

  async fillPassword(password: string): Promise<void> {
    await waitElement(this.page, this.passwordSelector, { state: 'visible', expectEnabled: true, log: 'all', logLabel: 'password' });
    await safeFill(this.page, this.passwordSelector, password, { log: 'all', logLabel: 'password' });
  }

  async clickLogin(): Promise<void> {
    await waitElement(this.page, this.loginButtonSelector, { state: 'visible', expectEnabled: true, log: 'all', logLabel: 'loginButton' });
    await safeClick(this.page, this.loginButtonSelector, { log: 'all', logLabel: 'loginButton' });
  }

  /**
   * Utilidades de verificación/lectura (para flows/tests)
   */
  async waitForInventoryVisible(): Promise<void> {
    await expect(this.page.locator(this.inventoryContainerSelector)).toBeVisible();
  }

  async getErrorText(): Promise<string> {
    const err = this.page.locator(this.errorSelector);
    await expect(err).toBeVisible();
    return (await err.textContent())?.trim() ?? '';
  }
}
