import { defineConfig, devices } from '@playwright/test';

const HEADLESS = process.env.HEADLESS !== 'false';
const SLOWMO_MS = Number(process.env.SLOWMO_MS ?? '0') || 0;

export default defineConfig({
  testDir: 'tests',
  timeout: 30 * 1000,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://example.com',
    headless: HEADLESS,
    launchOptions: { slowMo: SLOWMO_MS },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
