import { expect } from '@playwright/test';

export class LoginPage {
    constructor(page) {
        this.page = page;
        this.usernameInput = page.locator('#ion-input-0');
        this.passwordInput = page.locator('#ion-input-1');
        this.loginBtn = page.getByRole('button', { name: 'Login' });
    }

    async goto() {
        // Use environment variable for the login URL, providing a sane default
        const loginUrl = process.env.PLAYWRIGHT_OMS_URL || 'https://launchpad-dev.hotwax.io/login?isLoggedOut=true&redirectUrl=https://transfers-dev.hotwax.io/login';
        await this.page.goto(loginUrl);
        // Initial wait for the page to stabilize
        await this.page.waitForTimeout(3000);
    }

    async login(username, password) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.page.waitForTimeout(1000);
        await this.loginBtn.click();
        await this.page.waitForTimeout(3000);
    }
}
