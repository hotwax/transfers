import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Load env variables from .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Read base URL from env or default to dev server
const baseURL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://transfers-dev.hotwax.io';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright/playwright-report' }]],
  globalSetup: require.resolve('./global-setup'),
  use: {
    baseURL,
    headless: true,
    storageState: 'playwright/.auth/storageState.json',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    //{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  outputDir: 'playwright/test-results',
  // webServer: {
  //   command: 'npm run serve',
  //   url: baseURL,
  //   reuseExistingServer: true,
  //   timeout: 120_000
  // }
});
