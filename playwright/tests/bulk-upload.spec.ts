import { test, expect } from '@playwright/test';

async function gotoBulkUpload(page: any) {
  await page.goto('/bulk-upload');
  await page.waitForLoadState('networkidle');
}

async function setIonSelectValue(page: any, testId: string, value: string) {
  const select = page.locator(`[data-testid="${testId}"]:visible`).first();
  await expect(select).toBeVisible();
  await select.evaluate((el: any, v: string) => {
    el.value = v;
    el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v }, bubbles: true, composed: true }));
  }, value);
}

test.describe('Bulk Upload', () => {
  test('Bulk upload page renders and submit is disabled before file upload', async ({ page }) => {
    await gotoBulkUpload(page);

    await expect(page.getByTestId('bulk-upload-file-label')).toBeVisible();
    await expect(page.getByTestId('bulk-download-template-btn')).toBeVisible();
    await expect(page.getByTestId('bulk-upload-submit-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('Uploading csv enables submit and allows field mappings', async ({ page }) => {
    await gotoBulkUpload(page);

    const csvContent = [
      'externalOrderId,originFacilityId,destinationFacilityId,sku,quantity',
      'EXT-1001,CENTRAL,A221,MH09,5'
    ].join('\n');

    await page.getByTestId('bulk-upload-file-input').setInputFiles({
      name: 'transfer-orders.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    await expect(page.getByTestId('bulk-upload-submit-btn')).toBeEnabled();
    await expect(page.locator('body')).toContainText(/transfer-orders\.csv/i);

    await setIonSelectValue(page, 'bulk-field-select-externalOrderId', 'externalOrderId');
    await setIonSelectValue(page, 'bulk-field-select-originFacilityId', 'originFacilityId');
    await setIonSelectValue(page, 'bulk-field-select-destinationFacilityId', 'destinationFacilityId');
    await setIonSelectValue(page, 'bulk-field-select-sku', 'sku');
    await setIonSelectValue(page, 'bulk-field-select-quantity', 'quantity');
  });
});
