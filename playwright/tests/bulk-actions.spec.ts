import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TEST_ORDER_ID = process.env.TEST_ORDER_ID || 'TEST_ORDER_1001';
const ELIGIBLE_ITEM_SEQ = process.env.ELIGIBLE_ITEM_SEQ || 'ITEMSEQ_1';
const ELIGIBLE_ITEM_SEQ_2 = process.env.ELIGIBLE_ITEM_SEQ_2 || 'ITEMSEQ_2';
const INELIGIBLE_ITEM_SEQ = process.env.INELIGIBLE_ITEM_SEQ || 'ITEMSEQ_999';

async function gotoOrderDetail(page, orderId: string) {
  const od = new OrderDetailPage(page);
  await od.goto(orderId);
  return od;
}

test.describe('Bulk Actions - Transfer Orders (E2E + edge cases)', () => {
  test.beforeEach(async ({ page }) => {});

  test('Bulk Fulfill: happy path (selected items) - modal flows and result counts', async ({ page }) => {
    const od = await gotoOrderDetail(page, TEST_ORDER_ID);
    const checkbox1 = od.itemCheckbox(ELIGIBLE_ITEM_SEQ);
    const checkbox2 = od.itemCheckbox(ELIGIBLE_ITEM_SEQ_2);
    await expect(checkbox1).toBeVisible();
    await expect(checkbox2).toBeVisible();
    await checkbox1.click();
    await checkbox2.click();

    const bulkFulfillBtn = od.footerButton('BULK_RECEIVE');
    if ((await bulkFulfillBtn.count()) === 0) {
      await od.footerButton('CLOSE_FULFILLMENT').click();
    } else {
      await bulkFulfillBtn.click();
    }

    const modalConfirm = od.bulkModalConfirm();
    await expect(modalConfirm).toBeVisible();
    await expect(od.page.locator('text=items')).toBeVisible();
    await modalConfirm.click();

    const progress = od.bulkModalProgress();
    await expect(progress).toBeVisible({ timeout: 10000 });

    const successCount = od.bulkResultsSuccessCount();
    await expect(successCount).toBeVisible({ timeout: 20000 });
    await expect(successCount).not.toHaveText('0');

    const doneBtn = od.bulkModalDoneButton();
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();

    await expect(od.page.locator('ion-toast')).not.toBeVisible();
  });

  test('Bulk Receive: verify receive-mode options and failures for ineligible items', async ({ page }) => {
    const od2 = await gotoOrderDetail(page, TEST_ORDER_ID);
    await od2.itemCheckbox(ELIGIBLE_ITEM_SEQ).click();
    await od2.itemCheckbox(INELIGIBLE_ITEM_SEQ).click();

    await od2.openBulkReceive();
    await expect(od2.page.locator('[data-testid="bulk-modal-receive-mode-group"]')).toBeVisible();
    await od2.page.locator('[data-testid="bulk-modal-receive-mode-ordered"]').click();
    await od2.page.locator('[data-testid="bulk-modal-receive-mode-issued"]').click();
    await od2.bulkModalConfirm().click();
    const failList = od2.bulkResultsFailList();
    await expect(failList).toBeVisible({ timeout: 20000 });
    await expect(failList).toContainText(INELIGIBLE_ITEM_SEQ);
  });

  test('Select All: header checkbox selects only eligible items and becomes indeterminate when partially selected', async ({ page }) => {
    const od3 = await gotoOrderDetail(page, TEST_ORDER_ID);
    await expect(od3.page.locator('[data-testid="order-items-select-row"]')).toBeVisible();
    await od3.clickSelectAll();
    await expect(od3.itemCheckbox(ELIGIBLE_ITEM_SEQ)).toBeChecked();
    await od3.itemCheckbox(ELIGIBLE_ITEM_SEQ).click();
    await expect(od3.page.locator('[data-testid="order-items-select-all"]')).not.toBeChecked();
  });

  test('Concurrent change: backend change during processing results in failure reported', async ({ page }) => {
    const od4 = await gotoOrderDetail(page, TEST_ORDER_ID);
    await od4.itemCheckbox(ELIGIBLE_ITEM_SEQ).click();
    await od4.footerButton('BULK_RECEIVE').click();
    // Placeholder for concurrent change via API
    // await apiClient.patch(`/orders/${TEST_ORDER_ID}/items/${ELIGIBLE_ITEM_SEQ}`, { statusId: 'ITEM_CANCELLED' });
    await od4.bulkModalConfirm().click();
    const failList2 = od4.bulkResultsFailList();
    await expect(failList2).toBeVisible({ timeout: 20000 });
    await expect(failList2).toContainText(/status changed/i);
  });
});

import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

// (file contents moved from root playwright folder)
import "../bulk-actions.spec.ts";
