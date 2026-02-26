import { expect } from '@playwright/test';

export class TabsPage {
    constructor(page) {
        this.page = page;
        this.transfersTabBtn = page.getByTestId('tabs-transfers-btn');
        this.settingsTabBtn = page.getByTestId('tabs-settings-btn');
    }

    async goToTransfers() {
        await this.transfersTabBtn.click();
    }

    async goToSettings() {
        await this.settingsTabBtn.click();
    }
}
