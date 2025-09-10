import { Page, Locator, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

export type ActionTarget = string | Locator;

export interface ActionOptions {
  timeout?: number;          // ms
  retries?: number;          // reintentos en caso de error intermitente
  highlight?: boolean;       // resaltar el elemento antes de la acción
  clear?: boolean;           // limpiar input antes de escribir
  delayAfterMs?: number;     // pausa después de la acción
  screenshotOnError?: boolean;
  logLabel?: string;         // etiqueta para logs
  log?: 'none' | 'start' | 'success' | 'all'; // nivel de logging en consola
}

export interface WaitOptions {
  timeout?: number;
  state?: 'visible' | 'attached' | 'hidden' | 'detached';
  expectEnabled?: boolean;
  expectEditable?: boolean;
  hasText?: string | RegExp;
  highlight?: boolean;
  delayAfterMs?: number;
  logLabel?: string;
  log?: 'none' | 'start' | 'success' | 'all';
}

const ACTION_DELAY_MS = Number(process.env.ACTION_DELAY_MS ?? '0') || 0;
const DEFAULT_OPTS: Required<Omit<ActionOptions, 'logLabel'>> = {
  timeout: 10_000,
  retries: 1,
  highlight: true,
  clear: false,
  delayAfterMs: ACTION_DELAY_MS,
  screenshotOnError: true,
  log: 'none',
};

function asLocator(page: Page, target: ActionTarget): Locator {
  return typeof target === 'string' ? page.locator(target) : target;
}

// ANSI colors (sin dependencias)
const ANSI = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
} as const;
function color(c: keyof typeof ANSI, msg: string) {
  return `${ANSI[c]}${msg}${ANSI.reset}`;
}
function ensureDir(dir: string) {
  try { mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
}

function logStart(action: string, label?: string) {
  console.info(color('cyan', `[${action}] start${label ? ` (${label})` : ''}`));
}
function logOk(action: string, label?: string) {
  console.info(color('green', `[${action}] ok${label ? ` (${label})` : ''}`));
}
function logWarn(action: string, label?: string, err?: unknown) {
  console.warn(color('yellow', `[${action}] retry${label ? ` (${label})` : ''}: ${String(err)}`));
}
function logErr(action: string, label?: string, err?: unknown, screenshotPath?: string) {
  const base = `[${action}] fallo${label ? ` (${label})` : ''}: ${String(err)}`;
  console.error(color('red', screenshotPath ? `${base}\n  screenshot: ${screenshotPath}` : base));
}

/**
 * Highlights the given locator by applying a magenta outline.
 * Useful for debugging and visually identifying elements during tests.
 * @param locator - The Playwright Locator to highlight.
 */
export async function highlight(locator: Locator): Promise<void> {
  const handle = await locator.elementHandle();
  if (!handle) return;
  await locator.scrollIntoViewIfNeeded();
  await handle.evaluate((node: HTMLElement) => {
    const prev = node.style.outline;
    node.style.outline = '3px solid magenta';
    setTimeout(() => (node.style.outline = prev), 300);
  });
}

/**
 * Highlights the given locator with a red outline to indicate an error.
 * Useful for debugging failed interactions with elements.
 * @param locator - The Playwright Locator to highlight in red.
 */
export async function highlightError(locator: Locator): Promise<void> {
  const handle = await locator.elementHandle();
  if (!handle) return;
  await locator.scrollIntoViewIfNeeded();
  await handle.evaluate((node: HTMLElement) => {
    const prev = node.style.outline;
    node.style.outline = '3px solid red';
    setTimeout(() => (node.style.outline = prev), 800);
  });
}

/**
 * Retries the provided asynchronous function a specified number of times.
 * Executes the onRetry callback on each retry attempt.
 * @param fn - The asynchronous function to execute.
 * @param retries - The number of retry attempts.
 * @param onRetry - Optional callback executed on each retry attempt.
 * @returns The result of the asynchronous function.
 * @throws The last error encountered if all retries fail.
 */
async function withRetries<T>(
  fn: () => Promise<T>,
  retries: number,
  onRetry?: (attempt: number, err: unknown) => Promise<void> | void
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await onRetry?.(attempt + 1, err);
    }
  }
  throw lastErr;
}

/**
 * Navigates to the specified URL with optional logging and wait conditions.
 * @param page - The Playwright Page instance.
 * @param url - The URL to navigate to.
 * @param options - Optional navigation settings including timeout, waitUntil, and logging.
 */
export async function safeGoto(
  page: Page,
  url: string,
  options?: { timeout?: number; wait?: 'load' | 'domcontentloaded' | 'networkidle'; logLabel?: string; log?: 'none' | 'start' | 'success' | 'all'; delayAfterMs?: number }
) {
  const timeout = options?.timeout ?? 30_000;
  const waitUntil = options?.wait ?? 'domcontentloaded';
  const logMode = options?.log ?? 'none';
  if (logMode === 'start' || logMode === 'all') logStart('safeGoto', options?.logLabel);
  await page.goto(url, { timeout, waitUntil });
  if (logMode === 'success' || logMode === 'all') logOk('safeGoto', options?.logLabel);
  const pause = options?.delayAfterMs ?? ACTION_DELAY_MS;
  if (pause > 0) await page.waitForTimeout(pause);
}

/**
 * Performs a safe click action on the specified target with retries, logging, and error handling.
 * @param page - The Playwright Page instance.
 * @param target - The target element to click, specified as a string or Locator.
 * @param options - Optional settings for the click action including retries, logging, and error handling.
 */
export async function safeClick(page: Page, target: ActionTarget, options?: ActionOptions): Promise<void> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const loc = asLocator(page, target);

  if (opts.log === 'start' || opts.log === 'all') logStart('safeClick', opts.logLabel);

  await withRetries(async () => {
    await expect(loc).toBeVisible({ timeout: opts.timeout });
    if (opts.highlight) await highlight(loc);
    await loc.click({ timeout: opts.timeout });
    if (opts.delayAfterMs) await page.waitForTimeout(opts.delayAfterMs);
  }, opts.retries, async (attempt, err) => {
    logWarn('safeClick', opts.logLabel, err);
    await page.waitForTimeout(200);
  }).then(() => {
    if (opts.log === 'success' || opts.log === 'all') logOk('safeClick', opts.logLabel);
  }).catch(async (err) => {
    let screenshotPath: string | undefined;
    try {
      if (opts.screenshotOnError) {
        ensureDir('reports/screenshots');
        screenshotPath = `reports/screenshots/${Date.now()}_${opts.logLabel || 'safeClick'}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }
      try { await highlightError(loc); } catch { /* ignore */ }
    } catch { /* ignore */ }
    logErr('safeClick', opts.logLabel, err, screenshotPath);
    throw new Error(`[safeClick] fallo${opts.logLabel ? ` (${opts.logLabel})` : ''}: ${String(err)}`);
  });
}

/**
 * Performs a safe fill action on the specified target with retries, logging, and error handling.
 * Ensures the input is cleared before filling if the `clear` option is set.
 * @param page - The Playwright Page instance.
 * @param target - The target input element to fill, specified as a string or Locator.
 * @param value - The value to fill into the input element.
 * @param options - Optional settings for the fill action including retries, logging, and error handling.
 */
export async function safeFill(page: Page, target: ActionTarget, value: string, options?: ActionOptions): Promise<void> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const loc = asLocator(page, target);

  if (opts.log === 'start' || opts.log === 'all') logStart('safeFill', opts.logLabel);

  await withRetries(async () => {
    await expect(loc).toBeVisible({ timeout: opts.timeout });
    if (opts.highlight) await highlight(loc);
    if (opts.clear) {
      await loc.fill('', { timeout: opts.timeout });
    }
    await loc.fill(value, { timeout: opts.timeout });
    if (opts.delayAfterMs) await page.waitForTimeout(opts.delayAfterMs);
  }, opts.retries, async (attempt, err) => {
    logWarn('safeFill', opts.logLabel, err);
    await page.waitForTimeout(200);
  }).then(() => {
    if (opts.log === 'success' || opts.log === 'all') logOk('safeFill', opts.logLabel);
  }).catch(async (err) => {
    let screenshotPath: string | undefined;
    try {
      if (opts.screenshotOnError) {
        ensureDir('reports/screenshots');
        screenshotPath = `reports/screenshots/${Date.now()}_${opts.logLabel || 'safeFill'}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }
      try { await highlightError(loc); } catch { /* ignore */ }
    } catch { /* ignore */ }
    logErr('safeFill', opts.logLabel, err, screenshotPath);
    throw new Error(`[safeFill] fallo${opts.logLabel ? ` (${opts.logLabel})` : ''}: ${String(err)}`);
  });
}

/**
 * Waits for the specified element to reach the desired state with optional logging and error handling.
 * @param page - The Playwright Page instance.
 * @param target - The target element to wait for, specified as a string or Locator.
 * @param options - Optional settings for the wait action including timeout, state, logging, and error handling.
 * @returns The Locator instance for the waited element.
 * @throws An error if the element does not reach the desired state within the timeout.
 */
export async function waitElement(page: Page, target: ActionTarget, options?: WaitOptions): Promise<Locator> {
  const loc = typeof target === 'string' ? page.locator(target) : target;
  const timeout = options?.timeout ?? 10_000;
  const state = options?.state ?? 'visible';
  const logMode = options?.log ?? 'none';
  const label = options?.logLabel;
  const doHighlight = options?.highlight ?? true;
  const pause = options?.delayAfterMs ?? ACTION_DELAY_MS;

  if (logMode === 'start' || logMode === 'all') logStart('waitElement', label);
  // Espera principal por estado
  await loc.waitFor({ state, timeout });
  // Validaciones adicionales opcionales
  if (options?.expectEnabled) await expect(loc).toBeEnabled({ timeout });
  if (options?.expectEditable) await expect(loc).toBeEditable({ timeout });
  if (options?.hasText !== undefined) await expect(loc).toHaveText(options.hasText as any, { timeout });
  if (doHighlight) await highlight(loc);
  if (pause > 0) await page.waitForTimeout(pause);
  if (logMode === 'success' || logMode === 'all') logOk('waitElement', label);
  return loc;
}
