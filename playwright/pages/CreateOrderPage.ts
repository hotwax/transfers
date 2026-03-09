import { Page, expect } from '@playwright/test';

export class CreateOrderPage {
  page: Page;
  transferNameInput: any;
  productStoreSelectTrigger: any;
  originAssignBtn: any;
  destinationAssignBtn: any;
  lifecycleSelectTrigger: any;
  deliveryDateBtn: any;
  productSearchInput: any;
  addProductBtn: any;
  qtyInput: any;
  saveBtn: any;
  modalSearchInput: any;
  modalAssignBtn: any;

  constructor(page: Page) {
    this.page = page;
    this.transferNameInput = page.getByRole('textbox', { name: /transfer name/i });
    this.productStoreSelectTrigger = page.getByTestId('create-order-store-select');
    this.originAssignBtn = page.getByTestId('create-order-origin-assign-btn');
    this.destinationAssignBtn = page.getByTestId('create-order-destination-assign-btn');
    this.lifecycleSelectTrigger = page.locator('ion-card:has-text("Plan") ion-select').first();
    this.deliveryDateBtn = page.getByTestId('create-order-deliverydate-btn');
    this.productSearchInput = page.getByTestId('create-order-add-product-input');
    this.addProductBtn = page.getByTestId('create-order-add-product-btn');
    this.qtyInput = page.getByRole('spinbutton').first();
    this.saveBtn = page.getByTestId('create-order-submit-btn');
    this.modalSearchInput = page.getByTestId('select-facility-searchbar');
    this.modalAssignBtn = page.getByTestId('select-facility-save-btn');
  }

  async goto() {
    await this.page.goto('/create-order');
    await this.page.waitForLoadState('networkidle');
  }

  async setTransferName(name: string) {
    await this.transferNameInput.fill(name);
  }

  async selectProductStore(storeName: string) {
    await this.productStoreSelectTrigger.click();
    // pick option via role; try exact match first, then fallback to first available option
    const opt = this.page.getByRole('option', { name: new RegExp(`^${storeName}$`, 'i') });
    if ((await opt.count()) > 0) {
      await opt.first().click();
    } else {
      const anyOption = this.page.getByRole('option').first();
      if ((await anyOption.count()) > 0) {
        await anyOption.click();
      } else {
        const radio = this.page.getByRole('radio', { name: new RegExp(storeName, 'i') });
        if ((await radio.count()) > 0) {
          await radio.first().click();
        } else {
          const anyRadio = this.page.getByRole('radio').first();
          if ((await anyRadio.count()) > 0) {
            await anyRadio.click();
          }
        }
      }
    }
    await this.dismissSelectPopoverIfOpen();
  }

  async assignOrigin(searchQuery: string, facilityName: string) {
    await this.dismissSelectPopoverIfOpen();
    await this.originAssignBtn.click();
    await this.page.waitForTimeout(1000); // wait for modal slide-in
    await this.modalSearchInput.locator('input').fill(searchQuery);
    const row = this.page.getByTestId(`select-facility-row-${facilityName}`);
    if ((await row.count()) > 0) {
      await row.first().click();
    } else {
      await this.page.getByRole('radio', { name: facilityName }).click();
    }
    await this.modalAssignBtn.click();
    await this.page.waitForTimeout(1000); // wait for modal slide-out
  }

  async assignDestination(searchQuery: string, facilityName: string) {
    await this.dismissSelectPopoverIfOpen();
    await this.destinationAssignBtn.click();
    await this.page.waitForTimeout(1000); // wait for modal slide-in
    await this.modalSearchInput.locator('input').fill(searchQuery);
    const row = this.page.getByTestId(`select-facility-row-${facilityName}`);
    if ((await row.count()) > 0) {
      await row.first().click();
    } else {
      await this.page.getByRole('radio', { name: new RegExp(facilityName, 'i') }).click();
    }
    await this.modalAssignBtn.click();
    await this.page.waitForTimeout(1000); // wait for modal slide-out
  }

  async selectLifecycle(lifecycleOption: string) {
    await this.lifecycleSelectTrigger.click();
    await this.page.getByRole('radio', { name: lifecycleOption }).click();
    await this.dismissSelectPopoverIfOpen();
  }

  async selectTodayShipDate() {
    await this.page.getByTestId('create-order-shipdate-btn').click();
    await this.page.getByRole('button', { name: /Today/i }).click();
    await this.page.getByRole('button', { name: /Done|OK/i }).click();
  }

  async addProduct(sku: string) {
    // In Ionic 7, ion-input encapsulates the input inside a shadow DOM wrapper. 
    // Sometimes .fill() fails due to actionability checks failing on the host node. 
    // We target the inner input specifically.
    await this.productSearchInput.locator('input').fill(sku);
    await this.page.keyboard.press('Enter');

    // wait for the add button that appears for the search result
    await expect(this.addProductBtn).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000); // Sometimes Ionic button reactivity delays slightly
    await this.addProductBtn.click();
  }

  async setQuantity(qty: number) {
    const spin = this.page.getByRole('spinbutton').first();
    if ((await spin.count()) > 0) {
      await spin.fill(qty.toString());
      return;
    }
    // fallback: find number input
    const input = this.page.locator('input[type="number"]').first();
    await input.fill(qty.toString());
  }

  async clickSave() {
    await expect(this.saveBtn).toBeEnabled();
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => { }),
      this.saveBtn.click(),
    ]);
  }

  async dismissSelectPopoverIfOpen() {
    const popover = this.page.locator('ion-popover.select-popover');
    if (await popover.count() > 0 && await popover.first().isVisible()) {
      await this.page.keyboard.press('Escape');
      await expect(popover.first()).toBeHidden({ timeout: 3000 });
    }
  }
}
