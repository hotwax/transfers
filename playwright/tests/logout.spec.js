import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { TabsPage } from "../pages/TabsPage";
import { SettingsPage } from "../pages/SettingsPage";

/**
 * @test Verify user can logout successfully
 * @objective Ensure the user is securely signed out and their session is terminated.
 * 
 * @scenario
 * 1. Navigate to the app (starts logged-in via global authentication).
 * 2. Click the 'Settings' icon in the bottom Tab Bar to navigate to the settings screen.
 * 3. Locate and click the 'Logout' button.
 * 4. Verify that the URL changes to include 'isLoggedOut=true'.
 * 5. Verify that the login form (Username field) is visible again.
 */

test("Sanity | Transfer App | Verify user can logout successfully", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const tabsPage = new TabsPage(page);
    const settingsPage = new SettingsPage(page);

    // Step 1: Browse directly to the 'Transfers' dashboard (authorized session)
    await page.goto('/transfers');

    // Step 2: Navigate to Settings (Tab navigation)
    await tabsPage.goToSettings();

    // Step 3: Trigger the logout logic in the system
    await settingsPage.logout();

    // Step 4: Confirm user has been logged out and redirected to the login page
    await expect(page).toHaveURL(/.*isLoggedOut=true.*/);
    await expect(loginPage.usernameInput).toBeVisible();
});
