import { test, expect } from '@playwright/test';
import { OrderDetailPage } from './pages/orderDetail.page';

/**
 * Order Action Logic - Playwright Test Suite
 *
 * Tests the action mapping described in OrderActionValidator and the Order Action Logic document:
 * - Header-level actions: Approve, Cancel, Close Fulfillment, Bulk Receive
 * - Item-level actions via popover: Edit, Remove, Fulfill, Receive, Close Fulfillment, Approve, Cancel
 *
 * NOTE: These tests assume deterministic fixtures seeded via API. Provide env vars for:
 * - BASE_URL
 * - TEST_ORDER_CREATED (order in ORDER_CREATED state)
 * - TEST_ORDER_APPROVED_NO_IMPACT (Approved, no shipments/receipts)
 * - TEST_ORDER_APPROVED_WITH_SHIPMENTS (Approved with outbound shipments packed/shipped)
 * - TEST_ORDER_APPROVED_WITH_RECEIPTS (Approved with received items)
 * - TEST_ITEM_SEQ_CREATED, TEST_ITEM_SEQ_APPROVED, etc.
 *
 * CI should seed these fixtures before running the suite and export IDs via environment variables.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

const ORDER_CREATED = process.env.TEST_ORDER_CREATED || 'TEST_ORDER_CREATED';
const ORDER_APPROVED_NO_IMPACT = process.env.TEST_ORDER_APPROVED_NO_IMPACT || 'TEST_ORDER_APPROVED_NO_IMPACT';
const ORDER_APPROVED_WITH_SHIPMENTS = process.env.TEST_ORDER_APPROVED_WITH_SHIPMENTS || 'TEST_ORDER_APPROVED_WITH_SHIPMENTS';
const ORDER_APPROVED_WITH_RECEIPTS = process.env.TEST_ORDER_APPROVED_WITH_RECEIPTS || 'TEST_ORDER_APPROVED_WITH_RECEIPTS';

const ITEM_SEQ_CREATED = process.env.TEST_ITEM_SEQ_CREATED || 'ITEMSEQ_CREATED';
const ITEM_SEQ_APPROVED = process.env.TEST_ITEM_SEQ_APPROVED || 'ITEMSEQ_APPROVED';

async function gotoOrderDetail(page, orderId: string) {
  await page.goto(`${BASE_URL}/order-detail/${orderId}`);
  await page.waitForSelector('[data-testid="order-items-scroller"]', { timeout: 10000 });
}

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

    // On an approved order the approve button shouldn't exist
    await od.goto(ORDER_APPROVED_NO_IMPACT);
    await expect(od.footerButton('APPROVE')).toHaveCount(0);
  });

  test('Cancel header allowed only when no inventory impact or receipts', async ({ page }) => {
    // Approved, no impact -> cancel allowed
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_APPROVED_NO_IMPACT);
    const cancelBtn = od.footerButton('CANCEL');
    await expect(cancelBtn).toBeVisible();
    await expect(cancelBtn).toBeEnabled();

    // Approved with shipments -> cancel blocked
    await od.goto(ORDER_APPROVED_WITH_SHIPMENTS);
    await expect(od.footerButton('CANCEL')).toBeVisible();
    await expect(od.footerButton('CANCEL')).toBeDisabled();

    // Approved with receipts -> cancel blocked
    await od.goto(ORDER_APPROVED_WITH_RECEIPTS);
    await expect(od.footerButton('CANCEL')).toBeVisible();
    await expect(od.footerButton('CANCEL')).toBeDisabled();
  });

  test('Close Fulfillment visible only when inventory impacted and order approved', async ({ page }) => {
    // No impact -> close fulfillment disabled
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_APPROVED_NO_IMPACT);
    const closeFulfillBtn = od.footerButton('CLOSE_FULFILLMENT');
    await expect(closeFulfillBtn).toBeVisible();
    await expect(closeFulfillBtn).toBeDisabled();

    // With shipments -> enabled
    await od.goto(ORDER_APPROVED_WITH_SHIPMENTS);
    await expect(od.footerButton('CLOSE_FULFILLMENT')).toBeVisible();
    await expect(od.footerButton('CLOSE_FULFILLMENT')).toBeEnabled();
  });

  test('Item-level actions reflect item and order states', async ({ page }) => {
    // Order in Created state: item-level should show Edit/Remove for created items
    const od = new OrderDetailPage(page);
    await od.goto(ORDER_CREATED);
    const itemActionBtn = od.itemActionsButton(ITEM_SEQ_CREATED);
    await expect(itemActionBtn).toBeVisible();
    await itemActionBtn.click();
    // Popover actions have data-testid: order-item-detail-action-<action>
    await expect(od.popoverItemAction('APPROVE')).toBeVisible();
    await expect(od.popoverItemAction('CANCEL')).toBeVisible();

    // Approved order: item-level should show Fulfill/Receive/Close as applicable
    await od.goto(ORDER_APPROVED_WITH_SHIPMENTS);
    const approvedItemBtn = od.itemActionsButton(ITEM_SEQ_APPROVED);
    await expect(approvedItemBtn).toBeVisible();
    await approvedItemBtn.click();
    // Fulfill may or may not be allowed depending on item status; check for at least one action
    await expect(page.locator('[data-testid^="order-item-detail-action-"]')).toHaveCountGreaterThan(0);
  });
});
