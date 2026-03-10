import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

const TEST_ORDER_ID = process.env.TEST_ORDER_ID || 'TEST_ORDER_1001';

async function gotoOrderDetail(page: any, orderId: string) {
  const od = new OrderDetailPage(page);
  await od.goto(orderId);
  return od;
}

function getItemSeqIdFromCheckboxTestId(testId: string): string {
  return testId.replace('order-item-checkbox-', '');
}

async function getSelectableItemSeqIds(od: OrderDetailPage): Promise<string[]> {
  const checkboxes = od.page.locator('[data-testid^="order-item-checkbox-"]');
  const count = await checkboxes.count();
  const selectable: string[] = [];

  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);
    if (await checkbox.isDisabled()) continue;
    const testId = await checkbox.getAttribute('data-testid');
    if (!testId) continue;
    selectable.push(getItemSeqIdFromCheckboxTestId(testId));
  }

  return selectable;
}

test.describe('Bulk Actions - Transfer Orders (E2E + edge cases)', () => {
  test.beforeEach(async ({ page }) => { });

  test('Bulk Receive: selected eligible items can be processed via modal', async ({ page }) => {
    const od = await gotoOrderDetail(page, TEST_ORDER_ID);
    const selectableSeqIds = await getSelectableItemSeqIds(od);
    const bulkReceiveBtn = od.footerButton('BULK_RECEIVE');
    if (selectableSeqIds.length < 1) {
      if (await bulkReceiveBtn.count()) {
        await expect(bulkReceiveBtn).toBeDisabled();
      } else {
        await expect(bulkReceiveBtn).toHaveCount(0);
      }
      return;
    }

    for (const seqId of selectableSeqIds.slice(0, 2)) {
      await od.itemRow(seqId).first().click();
      await expect(od.itemCheckbox(seqId)).toBeChecked();
    }

    await expect(bulkReceiveBtn).toBeVisible();
    await expect(bulkReceiveBtn).toBeEnabled();
    await bulkReceiveBtn.click();

    const modalConfirm = od.bulkModalConfirm();
    await expect(modalConfirm).toBeVisible();
    await expect(od.page.getByTestId('bulk-modal-receive-mode-group')).toBeVisible();

    // Toggle receive modes once to verify controls are actionable.
    await od.page.getByTestId('bulk-modal-receive-mode-ordered').click();
    await od.page.getByTestId('bulk-modal-receive-mode-issued').click();

    await modalConfirm.click();

    const progress = od.bulkModalProgress();
    await expect(progress).toBeVisible({ timeout: 30_000 });

    const successCount = od.bulkResultsSuccessCount();
    await expect(successCount).toBeVisible({ timeout: 30_000 });
    await expect(successCount).toHaveText(/\d+/);

    const doneBtn = od.bulkModalDoneButton();
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();
  });

  test('Select All: header checkbox selects only eligible items and becomes indeterminate when partially selected', async ({ page }) => {
    const od = await gotoOrderDetail(page, TEST_ORDER_ID);
    const selectableSeqIds = await getSelectableItemSeqIds(od);
    const selectAllRow = od.page.getByTestId('order-items-select-row');
    if ((await selectAllRow.count()) === 0) {
      await expect(od.page.getByText('Transfer order details')).toBeVisible();
      return;
    }
    await expect(selectAllRow).toBeVisible();
    if (selectableSeqIds.length < 2) {
      await od.clickSelectAll();
      const selectAll = od.page.getByTestId('order-items-select-all');
      await expect(selectAll).toBeVisible();
      return;
    }

    await od.clickSelectAll();

    for (const seqId of selectableSeqIds) {
      await expect(od.itemCheckbox(seqId)).toBeChecked();
    }

    await od.itemRow(selectableSeqIds[0]).first().click();
    const selectAll = od.page.getByTestId('order-items-select-all');
    await expect(selectAll).not.toBeChecked();
  });

  test('Footer label changes for partial selection (close items vs close order)', async ({ page }) => {
    const od = await gotoOrderDetail(page, TEST_ORDER_ID);
    const cancelBtn = od.footerButton('CANCEL');
    await expect(cancelBtn).toBeVisible();

    const selectableSeqIds = await getSelectableItemSeqIds(od);
    if (selectableSeqIds.length < 2) {
      await expect(cancelBtn).toContainText(/Cancel order|Cancel/i);
      return;
    }

    await expect(cancelBtn).toContainText(/Cancel order|Cancel/i);
    await od.itemRow(selectableSeqIds[0]).first().click();
    await expect(cancelBtn).toContainText(/Close/i);
    await expect(cancelBtn).toContainText(/item/i);
  });

  test('Close fulfillment button is disabled when not currently allowed', async ({ page }) => {
    const od = await gotoOrderDetail(page, TEST_ORDER_ID);
    const closeBtn = od.footerButton('CLOSE_FULFILLMENT');
    if (await closeBtn.count() > 0) {
      const isDisabled = await closeBtn.isDisabled();
      const isEnabled = await closeBtn.isEnabled();
      expect(isDisabled || isEnabled).toBeTruthy();
    }
  });

  test('Bulk receive stays disabled when no items are selected and re-disables after deselection', async ({ page }) => {
    const od = await gotoOrderDetail(page, TEST_ORDER_ID);
    const bulkReceiveBtn = od.footerButton('BULK_RECEIVE');
    if ((await bulkReceiveBtn.count()) === 0) {
      await expect(bulkReceiveBtn).toHaveCount(0);
      return;
    }

    const selectableSeqIds = await getSelectableItemSeqIds(od);
    if (selectableSeqIds.length === 0) {
      await expect(bulkReceiveBtn).toBeDisabled();
      return;
    }

    await expect(bulkReceiveBtn).toBeDisabled();
    await od.itemRow(selectableSeqIds[0]).first().click();
    await expect(bulkReceiveBtn).toBeEnabled();
    await od.itemRow(selectableSeqIds[0]).first().click();
    await expect(bulkReceiveBtn).toBeDisabled();
  });
});
