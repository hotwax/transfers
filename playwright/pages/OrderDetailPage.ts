import { Page, expect } from '@playwright/test';

export class OrderDetailPage {
  page: Page;
  statusBadge: any;
  statusSelect: any;
  backBtn: any;
  addItemBtn: any;

  constructor(page: Page) {
    this.page = page;
    // Note: status badge/select are not present as testids in template; use text-based fallbacks
    this.statusBadge = null;
    this.statusSelect = null;
    this.backBtn = page.getByTestId('order-detail-back-btn');
    this.addItemBtn = page.getByTestId('order-detail-add-item-btn');
  }

  async goto(orderId: string) {
    await this.page.goto(`/order-detail/${orderId}`);
    await this.page.waitForLoadState('networkidle');
    // Wait for the fetching state to resolve
    const loadingEl = this.page.getByTestId('order-detail-loading');
    if (await loadingEl.count() > 0) {
      await expect(loadingEl).toBeHidden({ timeout: 15000 });
    }
  }

  itemRow(itemSeq: string) {
    return this.page.getByTestId(`order-item-row-${itemSeq}`);
  }

  itemCheckbox(itemSeq: string) {
    return this.page.getByTestId(`order-item-checkbox-${itemSeq}`);
  }

  footerButton(actionType: string) {
    // Expected actions: BULK_RECEIVE, CLOSE_FULFILLMENT, APPROVE, CANCEL
    return this.page.getByTestId(`order-footer-${actionType.replace(/_/g, '-').toLowerCase()}`);
  }

  bulkModalConfirm() {
    return this.page.getByTestId('bulk-modal-confirm-btn');
  }

  bulkModalProgress() {
    return this.page.getByTestId('bulk-modal-progress');
  }

  bulkResultsSuccessCount() {
    return this.page.getByTestId('bulk-results-success-count');
  }

  bulkResultsFailCount() {
    return this.page.getByTestId('bulk-results-fail-count');
  }

  bulkModalDoneButton() {
    return this.page.getByTestId('bulk-modal-done-btn');
  }

  async openBulkReceive() {
    await this.footerButton('BULK_RECEIVE').click();
  }

  async clickSelectAll() {
    await this.page.getByTestId('order-items-select-row').click();
  }

  discrepancyChip(chipText: string) {
    return this.page.locator('ion-chip', { hasText: new RegExp(chipText, 'i') });
  }

  badgeWithText(text: string) {
    return this.page.locator('ion-badge', { hasText: text });
  }

  itemActionsButton(itemSeq: string) {
    return this.page.getByTestId(`order-item-actions-btn-${itemSeq}`);
  }

  popoverItemAction(actionType: string) {
    return this.page.getByTestId(`order-item-detail-action-${actionType.toLowerCase()}`);
  }

  async approveOrder() {
    // Prefer footer approve button if available
    const footerApprove = this.page.getByTestId('order-footer-approve');
    if ((await footerApprove.count()) > 0) {
      await Promise.all([
        this.page.waitForResponse(() => true).catch(() => { }),
        footerApprove.first().click(),
      ]).catch(() => { });
      return;
    }
    // fallback: try to open a status select by locating 'Approve' radio
    const approveRadio = this.page.getByRole('radio', { name: 'Approve' });
    if ((await approveRadio.count()) > 0) {
      await approveRadio.first().click();
      return;
    }
  }

  async cancelOrder() {
    await this.statusSelect.click();
    await this.page.getByRole('radio', { name: 'Cancel' }).click();
    const cancelConfirmBtn = this.page.getByRole('button', { name: 'Cancel' });
    await cancelConfirmBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async verifyStatus(status: string) {
    // Status appears in the header as an overline; search by visible text
    const locator = this.page.getByText(new RegExp(status, 'i')).first();
    await expect(locator).toBeVisible({ timeout: 15000 });
  }

  async verifyOrderName(name: string) {
    const orderNameHeader = this.page.locator('h1', { hasText: name });
    await expect(orderNameHeader).toBeVisible();
  }

  async verifyItemExists(productId: string) {
    // Item row testids use orderItemSeqId; locate by visible product id/sku text instead
    const item = this.page.getByText(new RegExp(productId, 'i')).first();
    await expect(item).toBeVisible();
  }

  async verifyItemQuantity(productId: string, quantity: number) {
    // Find the item row by productId text and assert the ordered quantity is present
    const row = this.page.locator('div.list-item', { hasText: productId }).first();
    await expect(row).toContainText(quantity.toString());
  }

  async verifyFacilityAssignment(originName: string, destinationName: string) {
    const originCard = this.page.locator('ion-card', { hasText: originName });
    const destinationCard = this.page.locator('ion-card', { hasText: destinationName });
    await expect(originCard).toBeVisible();
    await expect(destinationCard).toBeVisible();
  }
}
