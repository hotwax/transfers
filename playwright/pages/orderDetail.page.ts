import { Page, Locator } from '@playwright/test';

export class OrderDetailPage {
  page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(orderId: string) {
    const base = process.env.BASE_URL || 'http://localhost:8080';
    await this.page.goto(`${base}/orders/${orderId}`);
    await this.page.waitForLoadState('networkidle');
  }

  footerButton(actionId: string): Locator {
    return this.page.locator(`[data-testid="footer-action-${actionId.toLowerCase()}"]`);
  }

  itemCheckbox(itemSeqId: string): Locator {
    return this.page.locator(`[data-testid="order-item-checkbox-${itemSeqId}"]`);
  }

  itemActionsButton(itemSeqId: string): Locator {
    return this.page.locator(`[data-testid="order-item-actions-${itemSeqId}"]`);
  }

  popoverItemAction(actionId: string): Locator {
    return this.page.locator(`[data-testid="item-action-${actionId}"]`);
  }

  clickSelectAll(): Promise<void> {
    return this.page.click('[data-testid="order-items-select-all"]');
  }

  discrepancyChip(key: string): Locator {
    return this.page.locator(`[data-testid="order-discrepancy-${key}"]`);
  }

  badgeWithText(text: string): Locator {
    return this.page.locator(`.badge:has-text("${text}")`);
  }

  openBulkReceive(): Promise<void> {
    return this.page.click('[data-testid="footer-action-bulk_receive"]');
  }

  bulkModalConfirm(): Locator {
    return this.page.locator('[data-testid="bulk-modal-confirm"]');
  }

  bulkModalProgress(): Locator {
    return this.page.locator('[data-testid="bulk-modal-progress"]');
  }

  bulkModalDoneButton(): Locator {
    return this.page.locator('[data-testid="bulk-modal-done"]');
  }

  bulkResultsSuccessCount(): Locator {
    return this.page.locator('[data-testid="bulk-results-success-count"]');
  }

  bulkResultsFailList(): Locator {
    return this.page.locator('[data-testid="bulk-results-fail-list"]');
  }
}

import { Page, Locator } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

export class OrderDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(orderId: string) {
    await this.page.goto(`${BASE_URL}/order-detail/${orderId}`);
    await this.page.waitForSelector('[data-testid="order-items-scroller"]', { timeout: 10000 });
  }

  // Footer button by action id (e.g. 'APPROVE', 'CLOSE_FULFILLMENT')
  footerButton(actionId: string): Locator {
    const suffix = actionId.replace(/_/g, '-').toLowerCase();
    const testId = `order-footer-${suffix}`;
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  // Item action button (three-dot) for a specific item sequence id
  itemActionsButton(orderItemSeqId: string): Locator {
    return this.page.locator(`[data-testid="order-item-actions-btn-${orderItemSeqId}"]`);
  }

  // Popover item action locator e.g. 'approve' -> order-item-detail-action-approve
  popoverItemAction(actionId: string): Locator {
    const suffix = actionId.replace(/_/g, '-').toLowerCase();
    return this.page.locator(`[data-testid="order-item-detail-action-${suffix}"]`);
  }

  // Convenience: check existence + enabled state
  async isFooterButtonVisible(actionId: string) {
    return (await this.footerButton(actionId).count()) > 0;
  }

  async isFooterButtonEnabled(actionId: string) {
    const locator = this.footerButton(actionId);
    if ((await locator.count()) === 0) return false;
    return await locator.isEnabled();
  }

  // Item checkbox for selecting an item
  itemCheckbox(orderItemSeqId: string): Locator {
    return this.page.locator(`[data-testid="order-item-checkbox-${orderItemSeqId}"]`);
  }

  // Click select-all header
  async clickSelectAll() {
    const sel = this.page.locator('[data-testid="order-items-select-all"]');
    if ((await sel.count()) > 0) await sel.click();
  }

  // Discrepancy chip by label (fallbacks included)
  discrepancyChip(label: string) {
    // prefer data-testid if present, otherwise button by name/text
    const testId = `order-discrepancy-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g,'')}`;
    const byTestId = this.page.locator(`[data-testid="${testId}"]`);
    if (byTestId.count) return byTestId.first();
    return this.page.getByRole('button', { name: label });
  }

  // Badge locator with exact text
  badgeWithText(text: string) {
    return this.page.locator('ion-badge', { hasText: text }).first();
  }

  // Bulk modal helpers
  bulkModalConfirm() { return this.page.locator('[data-testid="bulk-modal-confirm-btn"]'); }
  bulkModalProgress() { return this.page.locator('[data-testid="bulk-modal-progress"]'); }
  bulkModalDoneButton() { return this.page.locator('[data-testid="bulk-modal-done-btn"]'); }
  bulkResultsSuccessCount() { return this.page.locator('[data-testid="bulk-results-success-count"]'); }
  bulkResultsFailList() { return this.page.locator('[data-testid="bulk-results-fail-list"]'); }

  async openBulkReceive() {
    const btn = this.footerButton('BULK_RECEIVE');
    if ((await btn.count()) > 0) await btn.click();
  }
}
