import { expect } from '@playwright/test';

export class OrderDetailPage {
    constructor(page) {
        this.page = page;
        this.statusBadge = page.getByTestId('order-detail-status-badge');
        this.statusSelect = page.getByTestId('order-detail-status-select');
        this.backBtn = page.getByTestId('order-detail-back-btn');
        this.addItemBtn = page.getByTestId('order-detail-add-item-btn');
    }

    async approveOrder() {
        await this.statusSelect.click();
        await this.page.getByRole("radio", { name: "Approve" }).click();
    }

    async cancelOrder() {
        await this.statusSelect.click();
        await this.page.getByRole("radio", { name: "Cancel" }).click();
        // Handle alert confirmation if it appears
        const cancelConfirmBtn = this.page.getByRole('button', { name: 'Cancel' });
        await cancelConfirmBtn.click();
    }

    async verifyStatus(status) {
        await expect(this.statusBadge).toHaveText(new RegExp(status, 'i'));
    }

    async verifyOrderName(name) {
        const orderNameHeader = this.page.locator('h1', { hasText: name });
        await expect(orderNameHeader).toBeVisible();
    }

    async verifyItemExists(productId) {
        const itemRow = this.page.getByTestId(`order-detail-item-row-${productId}`);
        await expect(itemRow).toBeVisible();
    }

    async verifyItemQuantity(productId, quantity) {
        // Find the quantity chip for the specific item
        const qtyChip = this.page.getByTestId(`order-detail-item-qty-chip-${productId}`);
        // If qty chip is not found (e.g. on all items view), try finding the "ordered" text in the row
        if (await qtyChip.isVisible()) {
            await expect(qtyChip).toContainText(quantity.toString());
        } else {
            const itemRow = this.page.getByTestId(`order-detail-item-row-${productId}`);
            await expect(itemRow).toContainText(quantity.toString());
        }
    }

    async verifyFacilityAssignment(originName, destinationName) {
        const originCard = this.page.locator('ion-card', { hasText: originName });
        const destinationCard = this.page.locator('ion-card', { hasText: destinationName });
        await expect(originCard).toBeVisible();
        await expect(destinationCard).toBeVisible();
    }
}
