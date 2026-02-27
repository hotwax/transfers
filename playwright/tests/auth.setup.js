import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * @file auth.setup.js
 * @objective Global Authentication Setup
 * @scenario
 * 1. Navigate to the Hotwax Launchpad login page.
 * 2. Retrieve credentials from environment variables (fallback to defaults if local).
 * 3. Perform the login operation using the LoginPage POM.
 * 4. Verify landing on the Transfers application.
 * 5. Save the authenticated storage state (cookies/local storage) to a JSON file.
 */

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Open the login page
    await loginPage.goto();

    // Step 2: Perform secure login using credentials from environment variables
    const username = process.env.VUE_APP_PLAYWRIGHT_USERNAME;
    const password = process.env.VUE_APP_PLAYWRIGHT_PASSWORD;

    if (!username || !password) {
        throw new Error("Missing VUE_APP_PLAYWRIGHT_USERNAME or VUE_APP_PLAYWRIGHT_PASSWORD environment variables. Please check your .env file.");
    }

    await loginPage.login(username, password);

    // Step 3: Confirm successful login by checking for the 'transfers' URL fragment
    await expect(page).toHaveURL(/.*transfers/);

    // Step 4: Persist the session so all other tests can start logged-in
    await page.context().storageState({ path: authFile });
});
