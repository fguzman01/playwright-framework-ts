import { Given, When, Then } from '@cucumber/cucumber';
import { loginDo, assertLoginSuccess, assertLoginError } from '../../../src/flows/auth.flow';

// BDD: la data viene desde el .feature, no desde providers.
Given('que el usuario está en la página de login', async function () { /* no-op */ });

// Variante 1 (recomendada): DataTable
When('ingresa las credenciales:', async function (table) {
  const page = (this as any).page;
  const row = table.hashes()[0]; // primera fila
  await loginDo(page, { username: row.username, password: row.password });
});

// Variante 2: parámetros inline
When('ingresa username {string} y password {string}', async function (u: string, p: string) {
  const page = (this as any).page;
  await loginDo(page, { username: u, password: p });
});

// Validaciones
Then('debería ver el listado de productos', async function () {
  const page = (this as any).page;
  await assertLoginSuccess(page);
});

Then('debería ver el error {string}', async function (msg: string) {
  const page = (this as any).page;
  await assertLoginError(page, msg);
});
