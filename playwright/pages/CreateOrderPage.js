import { expect } from '@playwright/test';

export class CreateOrderPage {
    constructor(page) {
        this.page = page;
        this.transferNameInput = page.getByRole("textbox", { name: "Transfer name" });
        this.productStoreSelectTrigger = page.getByText("Product Store").locator("svg");
        this.originAssignBtn = page.getByText("Origin").getByRole("button", { name: "Assign" });
        this.destinationAssignBtn = page.getByText("Destination").getByRole("button", { name: "Assign" });
        this.lifecycleSelectTrigger = page.getByText("Lifecycle").locator("svg");
        this.deliveryDateBtn = page.getByTestId('create-order-delivery-date-btn');
        this.productSearchInput = page.getByTestId('create-order-product-search-input');
        this.addProductBtn = page.getByTestId('create-order-add-product-btn');
        this.qtyInput = page.getByRole("spinbutton", { name: /Qty/i });
        this.saveBtn = page.getByTestId('create-order-save-btn');
        // Select facility modal elements
        this.modalSearchInput = page.getByTestId('select-facility-modal-search-input');
        this.modalAssignBtn = page.getByTestId('select-facility-modal-save-btn');
    }

    async goto() {
        await this.page.goto('/create-order');
    }

    async setTransferName(name) {
        await this.transferNameInput.fill(name);
    }

    async selectProductStore(storeName) {
        await this.productStoreSelectTrigger.click();
        await this.page.getByRole("radio", { name: storeName }).click();
    }

    async assignOrigin(searchQuery, facilityName) {
        await this.originAssignBtn.click();
        await this.modalSearchInput.fill(searchQuery);
        await this.page.getByRole("radio", { name: facilityName }).click();
        await this.modalAssignBtn.click();
    }

    async assignDestination(searchQuery, facilityName) {
        await this.destinationAssignBtn.click();
        await this.modalSearchInput.fill(searchQuery);
        // Using a regex if necessary, or just name
        await this.page.getByRole("radio", { name: new RegExp(facilityName, 'i') }).click();
        await this.modalAssignBtn.click();
    }

    async selectLifecycle(lifecycleOption) {
        await this.lifecycleSelectTrigger.click();
        await this.page.getByRole("radio", { name: lifecycleOption }).click();
    }

    async selectTodayShipDate() {
        // Based on original test logic
        await this.page.getByText("Ship Date").getByRole("button", { name: "Select date" }).click();
        await this.page.getByRole("button", { name: /Today/i }).click();
        await this.page.getByRole("button", { name: "Done" }).click();
    }

    async addProduct(sku) {
        await this.productSearchInput.fill(sku);
        // Wait for search results appearing
        const searchResult = this.page.getByTestId('create-order-search-result-row');
        await expect(searchResult).toBeVisible();
        await this.addProductBtn.click();
    }

    async setQuantity(qty) {
        await this.qtyInput.fill(qty.toString());
    }

    async clickSave() {
        await expect(this.saveBtn).toBeEnabled();
        await this.saveBtn.click();
    }
}
