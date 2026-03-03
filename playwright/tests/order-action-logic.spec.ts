import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

const TEST_ORDER_ID = process.env.TEST_ORDER_ID || 'TEST_ORDER_1001';
const ELIGIBLE_ITEM_SEQ = process.env.ELIGIBLE_ITEM_SEQ || 'ITEMSEQ_1';

test.describe('Order Action Logic - Footer & Item Actions', () => {
  test('Footer shows correct actions based on selection and order state', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(TEST_ORDER_ID);

    // ensure footer action exists
    const footerBtn = od.footerButton('BULK_RECEIVE');
    await expect(footerBtn).toBeVisible();
  });

  test('Item actions dropdown contains expected actions from validator', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(TEST_ORDER_ID);

    await od.itemActionsButton(ELIGIBLE_ITEM_SEQ).click();
    const popover = od.page.locator('[data-testid="item-actions-popover"]');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(/Close fulfillment|Cancel|Receive|Approve/i);
  });
});

import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

/**
 * Order Action Logic - Playwright Test Suite (moved into tests folder)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

const ORDER_CREATED = process.env.TEST_ORDER_CREATED || 'TEST_ORDER_CREATED';
const ORDER_APPROVED_NO_IMPACT = process.env.TEST_ORDER_APPROVED_NO_IMPACT || 'TEST_ORDER_APPROVED_NO_IMPACT';
const ORDER_APPROVED_WITH_SHIPMENTS = process.env.TEST_ORDER_APPROVED_WITH_SHIPMENTS || 'TEST_ORDER_APPROVED_WITH_SHIPMENTS';
const ORDER_APPROVED_WITH_RECEIPTS = process.env.TEST_ORDER_APPROVED_WITH_RECEIPTS || 'TEST_ORDER_APPROVED_WITH_RECEIPTS';

const ITEM_SEQ_CREATED = process.env.TEST_ITEM_SEQ_CREATED || 'ITEMSEQ_CREATED';
const ITEM_SEQ_APPROVED = process.env.TEST_ITEM_SEQ_APPROVED || 'ITEMSEQ_APPROVED';

test.describe('Order Action Logic', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: implement auth helper in CI
  });

  test('Approval button is visible and enabled only on ORDER_CREATED', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_CREATED);
    const approveBtn = od.footerButton('APPROVE');
    await expect(approveBtn).toBeVisible();
    await expect(approveBtn).toBeEnabled();

    await od.goto(ORDER_APPROVED_NO_IMPACT);
    await expect(od.footerButton('APPROVE')).toHaveCount(0);
  });

  test('Cancel header allowed only when no inventory impact or receipts', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_APPROVED_NO_IMPACT);
    const cancelBtn = od.footerButton('CANCEL');
    await expect(cancelBtn).toBeVisible();
    await expect(cancelBtn).toBeEnabled();

    await od.goto(ORDER_APPROVED_WITH_SHIPMENTS);
    await expect(od.footerButton('CANCEL')).toBeVisible();
    await expect(od.footerButton('CANCEL')).toBeDisabled();

    await od.goto(ORDER_APPROVED_WITH_RECEIPTS);
    await expect(od.footerButton('CANCEL')).toBeVisible();
    await expect(od.footerButton('CANCEL')).toBeDisabled();
  });

  test('Close Fulfillment visible only when inventory impacted and order approved', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_APPROVED_NO_IMPACT);
    const closeFulfillBtn = od.footerButton('CLOSE_FULFILLMENT');
    await expect(closeFulfillBtn).toBeVisible();
    await expect(closeFulfillBtn).toBeDisabled();

    await od.goto(ORDER_APPROVED_WITH_SHIPMENTS);
    await expect(od.footerButton('CLOSE_FULFILLMENT')).toBeVisible();
    await expect(od.footerButton('CLOSE_FULFILLMENT')).toBeEnabled();
  });

  test('Item-level actions reflect item and order states', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_CREATED);
    const itemActionBtn = od.itemActionsButton(ITEM_SEQ_CREATED);
    await expect(itemActionBtn).toBeVisible();
    await itemActionBtn.click();
    await expect(od.popoverItemAction('APPROVE')).toBeVisible();
    await expect(od.popoverItemAction('CANCEL')).toBeVisible();

    await od.goto(ORDER_APPROVED_WITH_SHIPMENTS);
    const approvedItemBtn = od.itemActionsButton(ITEM_SEQ_APPROVED);
    await expect(approvedItemBtn).toBeVisible();
    await approvedItemBtn.click();
    await expect(page.locator('[data-testid^="order-item-detail-action-"]')).toHaveCountGreaterThan(0);
  });
});
