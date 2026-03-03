import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    storageState: path.join(__dirname, '.auth', 'storageState.json'),
    headless: true,
  },
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
import { defineConfig, devices } from '@playwright/test';

// Read base URL from env or default to localhost
const baseURL = process.env.BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright/playwright-report' }]],
  globalSetup: require.resolve('./global-setup'),
  use: {
    baseURL,
    headless: true,
    storageState: './.auth/storageState.json',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  outputDir: 'playwright/test-results',
  webServer: {
    command: 'npm run serve',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
