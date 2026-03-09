import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Load env variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Global setup will perform a login via UI using provided env vars and save storage state
// Env variables used:
// - BASE_URL (default http://localhost:8080)
// - AUTH_LOGIN_PATH (default /login)
// - TEST_USERNAME, TEST_PASSWORD
// - AUTH_SUCCESS_SELECTOR (selector that appears after successful login)

export default async function globalSetup(config: FullConfig) {
  const baseURL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://transfers-dev.hotwax.io';
  const loginPath = process.env.PLAYWRIGHT_OMS_URL || process.env.AUTH_LOGIN_PATH || '/login';
  const username = process.env.TEST_USERNAME || process.env.VUE_APP_PLAYWRIGHT_USERNAME;
  const password = process.env.TEST_PASSWORD || process.env.VUE_APP_PLAYWRIGHT_PASSWORD;
  const authSuccessSelector = process.env.AUTH_SUCCESS_SELECTOR || '[data-testid="transfers-search-input"]';

  const storageDir = path.join(process.cwd(), 'playwright', '.auth');
  const storageFile = path.join(storageDir, 'storageState.json');

  if (!username || !password) {
    console.log('TEST_USERNAME/TEST_PASSWORD not provided. Skipping global auth generation.');
    // Ensure directory exists so tests that expect storageState path don't fail
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    if (!fs.existsSync(storageFile)) fs.writeFileSync(storageFile, JSON.stringify({}), 'utf-8');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const loginUrl = new URL(loginPath, baseURL).toString();
    await page.goto(loginUrl, { waitUntil: 'networkidle' });

    // Try common selectors for username/email and password
    const usernameSelectors = [
      '[data-testid="username-input"] input',
      'ion-input[name="username"] input',
      'input[name="username"]',
      'input[name="email"]',
      '#username'
    ];
    const passwordSelectors = [
      '[data-testid="password-input"] input',
      'ion-input[name="password"] input',
      'input[name="password"]',
      '#password'
    ];

    // Wait for the form to render (Ionic pages can take a moment to be visible)
    await page.waitForTimeout(5000); // Wait explicitly to ensure elements are hydrated

    // Check if we hit the multi-step OMS launchpad
    const omsInput = page.locator('[data-testid="oms-input"] input');
    if (await omsInput.count() > 0 && await omsInput.isVisible()) {
      await omsInput.fill('https://dev-oms.hotwax.io');
      await page.locator('[data-testid="next-button"]').click();
      await page.waitForTimeout(3000); // wait for flip
    }

    let filled = false;
    for (const us of usernameSelectors) {
      if ((await page.locator(us).count()) > 0) {
        await page.locator(us).first().fill(username);
        for (const ps of passwordSelectors) {
          if ((await page.locator(ps).count()) > 0) {
            await page.locator(ps).first().fill(password);
            filled = true;
            break;
          }
        }
        if (filled) break;
      }
    }

    if (!filled) {
      console.log('Could not find username/password inputs on', loginUrl, '— skipping auto-login.');
      await page.screenshot({ path: path.join(process.cwd(), 'playwright', 'login-fail.png') });
      await browser.close();
      if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
      if (!fs.existsSync(storageFile)) fs.writeFileSync(storageFile, JSON.stringify({}), 'utf-8');
      return;
    }

    // Attempt to submit
    // Try common submit buttons
    const submitSelectors = ['button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Sign In")', 'button:has-text("Login")', 'button:has-text("Log in")'];
    let clicked = false;
    for (const s of submitSelectors) {
      if (await page.locator(s).count() > 0) {
        await page.click(s);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // Press Enter in password field as fallback
      await page.keyboard.press('Enter');
    }

    // Wait for success selector
    await page.waitForSelector(authSuccessSelector, { timeout: 15000 });

    // Save storage state
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    await page.context().storageState({ path: storageFile });
    console.log('Saved authentication storage to', storageFile);
  } catch (err) {
    console.warn('Global auth setup failed:', err.message || err);
    // Ensure file exists to avoid Playwright failing on missing storage file
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    if (!fs.existsSync(storageFile)) fs.writeFileSync(storageFile, JSON.stringify({}), 'utf-8');
  } finally {
    await browser.close();
  }
}
