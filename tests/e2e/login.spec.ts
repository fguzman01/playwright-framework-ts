import { test } from '@playwright/test';
import { loginDo, assertLoginSuccess, assertLoginError } from '../../src/flows/auth.flow';
import { loginProvider } from '../../src/data/providers/loginProvider';

test('login OK con alias "standard" (provider)', async ({ page }) => {
  const creds = loginProvider.getCreds('standard');
  await loginDo(page, creds);
  await assertLoginSuccess(page);
});

test('login bloqueado con caso "locked-out" (provider)', async ({ page }) => {
  const c = loginProvider.getCase('locked-out');
  await loginDo(page, c.creds);
  await assertLoginError(page, c.expectedError);
});
