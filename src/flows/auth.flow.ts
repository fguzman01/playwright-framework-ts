import { Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * ACCIONES (para usar en el When):
 * Navega al login y realiza el ingreso de credenciales + click.
 * No incluye aserciones.
 */
export async function loginDo(page: Page, creds: LoginCredentials): Promise<void> {
  const login = new LoginPage(page);
  await login.goto();
  await login.fillUsername(creds.username);
  await login.fillPassword(creds.password);
  await login.clickLogin();
}

/**
 * VALIDADORES (para usar en el Then):
 * Verifica que el usuario quedó logueado (inventario visible).
 */
export async function assertLoginSuccess(page: Page): Promise<void> {
  const login = new LoginPage(page);
  await login.waitForInventoryVisible();
  await expect(page.locator('#inventory_container')).toBeVisible();
}

/**
 * Valida que hay un error de login y, si se provee, que el mensaje coincida.
 */
export async function assertLoginError(page: Page, expectedMessage?: string): Promise<void> {
  const login = new LoginPage(page);
  const text = await login.getErrorText();
  await expect(text?.length ?? 0).toBeGreaterThan(0);
  if (expectedMessage) {
    await expect(text).toContain(expectedMessage);
  }
}
