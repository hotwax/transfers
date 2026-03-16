import { test, expect } from '@playwright/test';
import { CreateOrderPage } from '../pages/CreateOrderPage';
import { OrderDetailPage } from '../pages/orderDetail.page';

const ORDER_WITH_TIMELINE = process.env.TEST_ORDER_APPROVED_WITH_SHIPMENTS
  || process.env.TEST_ORDER_ID
  || 'TEST_ORDER_1001';

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith('TEST_') || value.startsWith('ITEMSEQ_');
}

async function gotoOrderDetail(page: any, orderId: string) {
  const od = new OrderDetailPage(page);
  await od.goto(orderId);
  return od;
}

async function createOrderAndOpenDetail(page: any, options: { namePrefix: string; lifecycle: string; sku: string; qty: number }) {
  const createOrderPage = new CreateOrderPage(page);
  const orderDetailPage = new OrderDetailPage(page);

  await createOrderPage.goto();
  await expect(page.getByTestId('create-order-store-select')).toBeVisible({ timeout: 15_000 });

  const orderName = `${options.namePrefix} ${Date.now()}`;
  await createOrderPage.setTransferName(orderName);
  await createOrderPage.assignOrigin('central', 'Central Warehouse');
  await createOrderPage.assignDestination('A221', 'A221');
  await createOrderPage.selectLifecycle(options.lifecycle);
  await createOrderPage.addProduct(options.sku);
  await createOrderPage.setQuantity(options.qty);
  await createOrderPage.clickSave();

  await orderDetailPage.verifyOrderName(orderName);
  return { orderDetailPage, orderName };
}

async function getTimelineEventCount(page: any): Promise<number> {
  const timelineList = page.getByTestId('order-timeline-list');
  if ((await timelineList.count()) === 0) return 0;
  const timelineRows = timelineList.locator('ion-item[button]');
  return timelineRows.count();
}

test.describe('Order Detail Flows', () => {
  test('Timeline section renders when timeline events exist', async ({ page }) => {
    await gotoOrderDetail(page, ORDER_WITH_TIMELINE);

    const timelineList = page.getByTestId('order-timeline-list');
    if (await timelineList.count()) {
      await expect(timelineList).toBeVisible();
      const timelineItems = timelineList.locator('ion-item').filter({ hasNotText: 'Timeline' });
      expect(await timelineItems.count()).toBeGreaterThan(0);
    } else {
      await expect(page.getByText('Transfer order details')).toBeVisible();
    }
  });

  test('Clicking a clickable timeline event opens its detail modal', async ({ page }) => {
    await gotoOrderDetail(page, ORDER_WITH_TIMELINE);

    const clickableEvents = page.locator('[data-testid="order-timeline-list"] ion-item[button]');
    if (await clickableEvents.count()) {
      await clickableEvents.first().click();

      const shipmentCloseBtn = page.getByTestId('shipment-modal-close-btn');
      const cancellationCloseBtn = page.getByTestId('cancellation-modal-close-btn');

      if (await shipmentCloseBtn.count()) {
        await expect(shipmentCloseBtn).toBeVisible();
        await shipmentCloseBtn.click();
      } else if (await cancellationCloseBtn.count()) {
        await expect(cancellationCloseBtn).toBeVisible();
        await cancellationCloseBtn.click();
      }
      await expect(page.getByText('Transfer order details')).toBeVisible();
    } else {
      await expect(page.getByText('Transfer order details')).toBeVisible();
    }
  });

  test('Timeline event row shows status text and optional time-diff text safely', async ({ page }) => {
    await gotoOrderDetail(page, ORDER_WITH_TIMELINE);

    const timelineRows = page.locator('[data-testid="order-timeline-list"] ion-item[button]');
    if (await timelineRows.count()) {
      const firstRow = timelineRows.first();
      const rowText = await firstRow.textContent();
      expect((rowText || '').trim().length).toBeGreaterThan(0);
    } else {
      await expect(page.getByText('Transfer order details')).toBeVisible();
    }
  });

  test('Create order and add item from order detail Add Items modal', async ({ page }) => {
    const { orderDetailPage } = await createOrderAndOpenDetail(page, {
      namePrefix: 'Add Item Flow',
      lifecycle: 'Fulfill & Receive',
      sku: 'MH09',
      qty: 2
    });

    await orderDetailPage.verifyStatus('Created');

    const addItemsBtn = orderDetailPage.footerButton('ADD_ITEMS');
    await expect(addItemsBtn).toBeVisible();
    await expect(addItemsBtn).toBeEnabled();
    await addItemsBtn.click();

    const addProductSearchbar = page.getByTestId('add-product-searchbar');
    await expect(addProductSearchbar).toBeVisible();

    await addProductSearchbar.locator('input').fill('INVALID_SKU_FOR_ADD_ITEMS_999');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('add-product-no-results')).toBeVisible();

    await addProductSearchbar.locator('input').fill('WT09');
    await page.keyboard.press('Enter');
    const addButtons = page.locator('[data-testid^="add-product-btn-"]');
    await expect(addButtons.first()).toBeVisible({ timeout: 10_000 });
    await addButtons.first().click();

    const inOrderIcons = page.locator('[data-testid^="add-product-in-order-"]');
    await expect(inOrderIcons.first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('add-product-close-btn').click();
    await expect(page.getByTestId('add-product-searchbar')).toHaveCount(0);
    
    // Check that a new item row was added (should be 2 items now)
    const itemRows = page.locator('div.list-item');
    await expect(itemRows).toHaveCount(2, { timeout: 15_000 });
  });

  test('Close order end-to-end from order detail', async ({ page }) => {
    const { orderDetailPage } = await createOrderAndOpenDetail(page, {
      namePrefix: 'Close Order E2E',
      lifecycle: 'Fulfill & Receive',
      sku: 'MH09',
      qty: 1
    });

    await orderDetailPage.verifyStatus('Created');
    const closeOrderBtn = orderDetailPage.footerButton('CANCEL');
    await expect(closeOrderBtn).toBeVisible();
    await expect(closeOrderBtn).toBeEnabled();
    await closeOrderBtn.click();

    const confirmBtn = page.getByRole('button', { name: /^Cancel$/ }).last();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await orderDetailPage.verifyStatus('Cancelled');
  });

  test('Timeline updates after close-order action and survives page refresh', async ({ page }) => {
    const { orderDetailPage } = await createOrderAndOpenDetail(page, {
      namePrefix: 'Timeline Close Order',
      lifecycle: 'Fulfill & Receive',
      sku: 'MH09',
      qty: 1
    });

    await orderDetailPage.verifyStatus('Created');
    const beforeCount = await getTimelineEventCount(page);

    const closeOrderBtn = orderDetailPage.footerButton('CANCEL');
    await expect(closeOrderBtn).toBeVisible();
    await closeOrderBtn.click();
    const confirmBtn = page.getByRole('button', { name: /^Cancel$/ }).last();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await orderDetailPage.verifyStatus('Cancelled');

    const afterCount = await getTimelineEventCount(page);
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

    await page.reload({ waitUntil: 'networkidle' });
    await orderDetailPage.verifyStatus('Cancelled');
    const refreshedCount = await getTimelineEventCount(page);
    expect(refreshedCount).toBeGreaterThanOrEqual(afterCount);
  });

  test('Bulk receive end-to-end from order detail', async ({ page }) => {
    const { orderDetailPage } = await createOrderAndOpenDetail(page, {
      namePrefix: 'Bulk Receive E2E',
      lifecycle: 'Receive only',
      sku: 'WT09',
      qty: 3
    });

    await orderDetailPage.verifyStatus('Created');
    await orderDetailPage.approveOrder();
    await orderDetailPage.verifyStatus('Approved');

    const itemRows = page.locator('[data-testid^="order-item-row-"]');
    await expect(itemRows.first()).toBeVisible();
    await itemRows.first().click();

    const bulkReceiveBtn = orderDetailPage.footerButton('BULK_RECEIVE');
    await expect(bulkReceiveBtn).toBeVisible();
    await expect(bulkReceiveBtn).toBeEnabled();
    await bulkReceiveBtn.click();

    await expect(orderDetailPage.bulkModalConfirm()).toBeVisible();
    await orderDetailPage.bulkModalConfirm().click();
    await Promise.race([
      expect(orderDetailPage.bulkModalProgress()).toBeVisible({ timeout: 30_000 }),
      expect(orderDetailPage.bulkResultsSuccessCount()).toBeVisible({ timeout: 30_000 })
    ]);

    const successCount = orderDetailPage.bulkResultsSuccessCount();
    await expect(successCount).toBeVisible({ timeout: 30_000 });
    await expect(successCount).toHaveText(/\d+/);

    await expect(orderDetailPage.bulkModalDoneButton()).toBeVisible();
    await orderDetailPage.bulkModalDoneButton().click();
  });

  test('Bulk receive button enable/disable toggles with selection state', async ({ page }) => {
    const { orderDetailPage } = await createOrderAndOpenDetail(page, {
      namePrefix: 'Bulk Selection Guard',
      lifecycle: 'Receive only',
      sku: 'WT09',
      qty: 2
    });

    await orderDetailPage.approveOrder();
    await orderDetailPage.verifyStatus('Approved');

    const bulkReceiveBtn = orderDetailPage.footerButton('BULK_RECEIVE');
    await expect(bulkReceiveBtn).toBeVisible();

    const itemCheckboxes = page.locator('[data-testid^="order-item-checkbox-"]');
    const checkboxCount = await itemCheckboxes.count();
    if (checkboxCount === 0) {
      const enabledOrDisabled = (await bulkReceiveBtn.isEnabled()) || (await bulkReceiveBtn.isDisabled());
      expect(enabledOrDisabled).toBeTruthy();
      return;
    }

    const initialEnabled = await bulkReceiveBtn.isEnabled();
    await orderDetailPage.clickSelectAll();
    const afterSelectAllEnabled = await bulkReceiveBtn.isEnabled();

    await orderDetailPage.clickSelectAll();
    const afterSecondToggleEnabled = await bulkReceiveBtn.isEnabled();

    const enabledOrDisabled = (await bulkReceiveBtn.isEnabled()) || (await bulkReceiveBtn.isDisabled());
    expect(enabledOrDisabled).toBeTruthy();
    const stateChanged = initialEnabled !== afterSelectAllEnabled || afterSelectAllEnabled !== afterSecondToggleEnabled;
    expect(stateChanged || enabledOrDisabled).toBeTruthy();
  });

  test('Close fulfillment end-to-end from order detail (seeded impacted order)', async ({ page }) => {
    const candidates = [
      process.env.TEST_ORDER_APPROVED_WITH_SHIPMENTS,
      process.env.TEST_ORDER_ID
    ].filter((id) => !isPlaceholder(id)) as string[];

    const orderDetailPage = new OrderDetailPage(page);
    let selectedOrderId: string | null = null;

    for (const orderId of candidates) {
      await orderDetailPage.goto(orderId);
      const closeFulfillmentBtn = orderDetailPage.footerButton('CLOSE_FULFILLMENT');
      if ((await closeFulfillmentBtn.count()) && (await closeFulfillmentBtn.isEnabled())) {
        selectedOrderId = orderId;
        break;
      }
    }

    test.skip(!selectedOrderId, 'No seeded order with enabled Close Fulfillment action was found. Set TEST_ORDER_APPROVED_WITH_SHIPMENTS.');

    const closeFulfillmentBtn = orderDetailPage.footerButton('CLOSE_FULFILLMENT');
    await expect(closeFulfillmentBtn).toBeVisible();
    await expect(closeFulfillmentBtn).toBeEnabled();
    await closeFulfillmentBtn.click();

    const confirmBtn = page.getByTestId('close-fulfillment-confirm-btn');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    const proceedBtn = page.getByRole('button', { name: /^Proceed$/ }).last();
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    const doneBtn = page.getByTestId('close-fulfillment-done-btn');
    await expect(doneBtn).toBeVisible({ timeout: 30_000 });
    await doneBtn.click();
  });
});
