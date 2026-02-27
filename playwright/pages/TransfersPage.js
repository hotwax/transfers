import { expect } from '@playwright/test';

export class TransfersPage {
    constructor(page) {
        this.page = page;
        this.createOrderBtn = page.getByTestId('transfers-create-btn');
        this.loadingState = page.getByTestId('transfers-loading');
        this.emptyState = page.getByTestId('transfers-empty-state');
        this.transfersSearchInput = page.locator('ion-searchbar'); // Fallback if no specific testid for main search
        // Dynamic locators as methods
    }

    async goto() {
        await this.page.goto('/transfers');
    }

    async selectOrderWithStatus(status) {
        // Find the section header or accordion that contains the desired status badge
        const orderRow = this.page.locator('.section-header, .list-item', {
            has: this.page.locator('ion-badge', { hasText: status })
        }).first();
        await orderRow.scrollIntoViewIfNeeded();
        await orderRow.click();
    }

    async clickCreateOrder() {
        await this.createOrderBtn.click();
    }
}
