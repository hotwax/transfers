import { Page } from '@playwright/test';

export class TabsPage {
  page: Page;
  transfersTabBtn: any;
  settingsTabBtn: any;

  constructor(page: Page) {
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
