import { expect } from '@playwright/test';

export class SettingsPage {
    constructor(page) {
        this.page = page;
        this.logoutBtn = page.getByTestId('settings-logout-btn');
    }

    async logout() {
        await this.logoutBtn.click();
    }
}
