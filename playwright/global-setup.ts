import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects?.[0]?.use || {};
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  const storagePath = path.resolve(__dirname, '.auth', 'storageState.json');

  if (!fs.existsSync(path.dirname(storagePath))) {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  }

  if (!username || !password) {
    // create empty state so tests still run but unauthenticated
    fs.writeFileSync(storagePath, JSON.stringify({}));
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const loginUrl = process.env.AUTH_LOGIN_PATH || `${process.env.BASE_URL || 'http://localhost:8080'}/login`;
  await page.goto(loginUrl);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  const storage = await page.context().storageState();
  fs.writeFileSync(storagePath, JSON.stringify(storage));
  await browser.close();
}

export default globalSetup;
import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Global setup will perform a login via UI using provided env vars and save storage state
// Env variables used:
// - BASE_URL (default http://localhost:8080)
// - AUTH_LOGIN_PATH (default /login)
// - TEST_USERNAME, TEST_PASSWORD
// - AUTH_SUCCESS_SELECTOR (selector that appears after successful login)

export default async function globalSetup(config: FullConfig) {
  const baseURL = process.env.BASE_URL || 'http://localhost:8080';
  const loginPath = process.env.AUTH_LOGIN_PATH || '/login';
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  const authSuccessSelector = process.env.AUTH_SUCCESS_SELECTOR || '[data-testid="order-items-scroller"]';

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
    const usernameSelectors = ['input[name="username"]', 'input[name="email"]', '#username', '#email', 'input[type="email"]', 'input[type="text"]'];
    const passwordSelectors = ['input[name="password"]', '#password', 'input[type="password"]'];

    let filled = false;
    for (const us of usernameSelectors) {
      if (await page.locator(us).count() > 0) {
        await page.fill(us, username);
        for (const ps of passwordSelectors) {
          if (await page.locator(ps).count() > 0) {
            await page.fill(ps, password);
            filled = true;
            break;
          }
        }
        if (filled) break;
      }
    }

    if (!filled) {
      console.log('Could not find username/password inputs on', loginUrl, '— skipping auto-login.');
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
