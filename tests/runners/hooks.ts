import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

const HEADLESS = process.env.HEADLESS !== 'false';
const SLOWMO_MS = Number(process.env.SLOWMO_MS ?? '0') || 0;
const KEEP_OPEN = process.env.KEEP_BROWSER_OPEN === '1';

setDefaultTimeout(60 * 1000);

let browser: Browser;

declare global {
  // Adjuntamos estas propiedades al "this" (World) de Cucumber
  // Usaremos "any" en steps para simplificar el tipado.
  // eslint-disable-next-line no-var
  var __PW__: {
    browser?: Browser;
  };
}

BeforeAll(async () => {
  browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO_MS });
  global.__PW__ = { browser };
});

AfterAll(async () => {
  if (KEEP_OPEN) {
    console.log('KEEP_BROWSER_OPEN=1: dejando el navegador abierto para inspección manual.');
    return;
  }
  await browser?.close();
});

Before(async function () {
  const ctx: BrowserContext = await browser.newContext();
  const page: Page = await ctx.newPage();
  // Guardamos en el World de Cucumber (this)
  (this as any).context = ctx;
  (this as any).page = page;
});

After(async function () {
  if (KEEP_OPEN) return; // no cerramos ni page ni context
  try { await (this as any).page?.close(); } catch {}
  try { await (this as any).context?.close(); } catch {}
});
