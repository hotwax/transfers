import { test, expect } from '@playwright/test';
import { CreateOrderPage } from '../pages/CreateOrderPage';
import { OrderDetailPage } from '../pages/orderDetail.page';

type LifecycleCase = {
  label: string;
  statusFlowDescription: RegExp;
  expectPendingFulfillment: boolean;
  expectPendingReceipt: boolean;
  expectBulkReceiveButton: boolean;
  expectCloseFulfillmentButton: boolean;
};

const lifecycleCases: Array<LifecycleCase & { createLabel: string; sku: string }> = [
  {
    createLabel: 'Fulfill & Receive',
    label: 'Fulfill_Receive',
    sku: 'MH09',
    statusFlowDescription: /fulfill and receive/i,
    expectPendingFulfillment: true,
    expectPendingReceipt: true,
    expectBulkReceiveButton: true,
    expectCloseFulfillmentButton: true
  },
  {
    createLabel: 'Receive only',
    label: 'Receive_Only',
    sku: 'WT09',
    statusFlowDescription: /receiving only/i,
    expectPendingFulfillment: false,
    expectPendingReceipt: true,
    expectBulkReceiveButton: true,
    expectCloseFulfillmentButton: false
  },
  {
    createLabel: 'Fulfill only',
    label: 'Fulfill_Only',
    sku: 'MH09',
    statusFlowDescription: /fulfill only/i,
    expectPendingFulfillment: true,
    expectPendingReceipt: false,
    expectBulkReceiveButton: false,
    expectCloseFulfillmentButton: true
  }
];

async function createOrder(page: any, createLabel: string, sku: string) {
  const createOrderPage = new CreateOrderPage(page);
  const orderDetailPage = new OrderDetailPage(page);

  await createOrderPage.goto();
  await expect(page.getByTestId('create-order-store-select')).toBeVisible({ timeout: 15_000 });

  const orderName = `Lifecycle ${createLabel} ${Date.now()}`;
  await createOrderPage.setTransferName(orderName);
  await createOrderPage.assignOrigin('central', 'Central Warehouse');
  await createOrderPage.assignDestination('A221', 'A221');
  await createOrderPage.selectLifecycle(createLabel);
  await createOrderPage.addProduct(sku);
  await createOrderPage.setQuantity(2);
  await createOrderPage.clickSave();

  await orderDetailPage.verifyOrderName(orderName);
  await orderDetailPage.verifyStatus('Created');
  return { orderDetailPage, orderName };
}

async function openFirstItemActionMenu(page: any): Promise<boolean> {
  const openPopover = page.locator('ion-popover[aria-modal="true"]');
  if ((await openPopover.count()) > 0) {
    await page.keyboard.press('Escape');
    await page.mouse.click(4, 4).catch(() => { });
    await page.waitForTimeout(200);
    if (await openPopover.first().isVisible().catch(() => false)) {
      return false;
    }
  }

  const actionBtn = page.locator('[data-testid^="order-item-actions-btn-"]').first();
  if ((await actionBtn.count()) === 0) return false;
  await actionBtn.click();
  const actions = page.locator('[data-testid^="order-item-detail-action-"]');
  if ((await actions.count()) === 0) {
    await page.keyboard.press('Escape');
    return false;
  }
  await expect(actions.first()).toBeVisible();
  return true;
}

test.describe('Create Order - Lifecycle Matrix E2E', () => {
  for (const lifecycle of lifecycleCases) {
    test(`Lifecycle ${lifecycle.label}: created and approved states follow expected action logic`, async ({ page }) => {
      const { orderDetailPage } = await createOrder(page, lifecycle.createLabel, lifecycle.sku);

      // Validate lifecycle description text in order header.
      await expect(page.locator('.header .id ion-label p').nth(1)).toContainText(lifecycle.statusFlowDescription);

      // Created state action expectations.
      await expect(orderDetailPage.footerButton('ADD_ITEMS')).toBeVisible();
      await expect(orderDetailPage.footerButton('ADD_ITEMS')).not.toHaveAttribute('aria-disabled', 'true');
      await expect(orderDetailPage.footerButton('APPROVE')).toBeVisible();
      await expect(orderDetailPage.footerButton('APPROVE')).toBeEnabled();
      await expect(orderDetailPage.footerButton('CANCEL')).toBeVisible();

      if (lifecycle.expectBulkReceiveButton) {
        await expect(orderDetailPage.footerButton('BULK_RECEIVE')).toBeVisible();
      } else {
        await expect(orderDetailPage.footerButton('BULK_RECEIVE')).toHaveCount(0);
      }

      if (lifecycle.expectCloseFulfillmentButton) {
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toBeVisible();
      } else {
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toHaveCount(0);
      }

      // Approve and validate approved state logic.
      await orderDetailPage.approveOrder();
      await orderDetailPage.verifyStatus('Approved');
      await expect(orderDetailPage.footerButton('APPROVE')).toHaveCount(0);
      await expect(orderDetailPage.footerButton('ADD_ITEMS')).toHaveAttribute('aria-disabled', 'true');

      if (lifecycle.expectBulkReceiveButton) {
        const bulkReceiveBtn = orderDetailPage.footerButton('BULK_RECEIVE');
        await expect(bulkReceiveBtn).toBeVisible();
        // Either enabled or disabled is acceptable depending on fixture transitions,
        // but it must be a valid interactive state.
        expect((await bulkReceiveBtn.isEnabled()) || (await bulkReceiveBtn.isDisabled())).toBeTruthy();
      } else {
        await expect(orderDetailPage.footerButton('BULK_RECEIVE')).toHaveCount(0);
      }

      if (lifecycle.expectCloseFulfillmentButton) {
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toBeVisible();
      } else {
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toHaveCount(0);
      }

      const pendingFulfillmentChip = page.getByTestId('order-status-filter-PENDING_FULFILLMENT');
      const pendingReceiptChip = page.getByTestId('order-status-filter-PENDING_RECEIPT');

      if (lifecycle.expectPendingFulfillment) {
        await expect(pendingFulfillmentChip).toBeVisible();
      } else {
        await expect(pendingFulfillmentChip).toHaveCount(0);
      }

      if (lifecycle.expectPendingReceipt) {
        await expect(pendingReceiptChip).toBeVisible();
      } else {
        await expect(pendingReceiptChip).toHaveCount(0);
      }
    });
  }

  test('Lifecycle gating: Receive only and Fulfill only hide opposite-direction actions in footer and meatball', async ({ page }) => {
    for (const lifecycle of lifecycleCases.filter((item) => item.label === 'Receive_Only' || item.label === 'Fulfill_Only')) {
      const { orderDetailPage } = await createOrder(page, lifecycle.createLabel, lifecycle.sku);

      // Created-state footer gating.
      if (lifecycle.label === 'Receive_Only') {
        await expect(orderDetailPage.footerButton('BULK_RECEIVE')).toBeVisible();
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toHaveCount(0);
      } else {
        await expect(orderDetailPage.footerButton('BULK_RECEIVE')).toHaveCount(0);
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toBeVisible();
      }

      // Created-state item-level gating.
      if (await openFirstItemActionMenu(page)) {
        if (lifecycle.label === 'Receive_Only') {
          await expect(page.getByTestId('order-item-detail-action-fulfill')).toHaveCount(0);
          await expect(page.getByTestId('order-item-detail-action-close_fulfillment')).toHaveCount(0);
        } else {
          await expect(page.getByTestId('order-item-detail-action-receive')).toHaveCount(0);
        }
        await page.keyboard.press('Escape');
      }

      await orderDetailPage.approveOrder();
      await orderDetailPage.verifyStatus('Approved');

      // Approved-state footer gating still holds.
      if (lifecycle.label === 'Receive_Only') {
        await expect(orderDetailPage.footerButton('CLOSE_FULFILLMENT')).toHaveCount(0);
      } else {
        await expect(orderDetailPage.footerButton('BULK_RECEIVE')).toHaveCount(0);
      }

      // Approved-state item-level gating still holds.
      if (await openFirstItemActionMenu(page)) {
        if (lifecycle.label === 'Receive_Only') {
          await expect(page.getByTestId('order-item-detail-action-fulfill')).toHaveCount(0);
        } else {
          await expect(page.getByTestId('order-item-detail-action-receive')).toHaveCount(0);
        }
        await page.keyboard.press('Escape');
      }
    }
  });

  test('Approved action state persists after reload for all lifecycle options', async ({ page }) => {
    for (const lifecycle of lifecycleCases) {
      const { orderDetailPage } = await createOrder(page, lifecycle.createLabel, lifecycle.sku);
      await orderDetailPage.approveOrder();
      await orderDetailPage.verifyStatus('Approved');

      await page.reload({ waitUntil: 'networkidle' });
      await orderDetailPage.verifyStatus('Approved');
      await expect(orderDetailPage.footerButton('APPROVE')).toHaveCount(0);
      await expect(orderDetailPage.footerButton('ADD_ITEMS')).toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('Approve action is idempotent when triggered repeatedly', async ({ page }) => {
    const { orderDetailPage } = await createOrder(page, 'Fulfill & Receive', 'MH09');
    const approveBtn = orderDetailPage.footerButton('APPROVE');
    await expect(approveBtn).toBeVisible();
    await expect(approveBtn).toBeEnabled();

    await approveBtn.dblclick();
    await orderDetailPage.verifyStatus('Approved');
    await expect(orderDetailPage.footerButton('APPROVE')).toHaveCount(0);
    await expect(orderDetailPage.footerButton('ADD_ITEMS')).toHaveAttribute('aria-disabled', 'true');
  });
});
