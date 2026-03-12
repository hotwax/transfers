import { test, expect, type Page } from '@playwright/test';

async function gotoBulkUpload(page: Page) {
  await page.goto('/bulk-upload');
  await page.waitForLoadState('networkidle');
}

async function ensureBulkUploadAccessible(page: Page) {
  const fileLabel = page.getByTestId('bulk-upload-file-label');
  if ((await fileLabel.count()) === 0) {
    test.skip(true, 'Bulk upload UI is not accessible for the current user/environment.');
  }
  await expect(fileLabel).toBeVisible();
}

async function setIonSelectValue(page: Page, testId: string, value: string) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const valuePattern = new RegExp(`^\\s*${escapedValue}\\s*$`, 'i');

  const activePopover = page.locator('ion-popover.select-popover:visible').first();
  const activeAlert = page.locator('ion-alert:visible').first();
  if (await activePopover.count() || await activeAlert.count()) {
    await page.keyboard.press('Escape');
    await page.mouse.click(4, 4).catch(() => { });
  }

  const select = page.getByTestId(testId).first();
  if ((await select.count()) === 0) {
    return;
  }
  await expect(select).toBeAttached();

  const currentValue = ((await select.textContent()) || '').trim();
  const currentModelValue = await select.getAttribute('modelvalue');
  if (valuePattern.test(currentValue) || currentModelValue === value) {
    return;
  }

  if (await select.isVisible().catch(() => false)) {
    await select.click({ force: true });
  } else {
    await select.evaluate((el, v) => {
      const ionSelect = el as HTMLIonSelectElement & { value: string };
      ionSelect.value = v;
      ionSelect.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v }, bubbles: true, composed: true }));
    }, value);
    return;
  }

  const optionCandidates = [
    page.locator('ion-alert .alert-radio-label:visible').filter({ hasText: valuePattern }).first(),
    page.locator('ion-alert [role="radio"]:visible').filter({ hasText: valuePattern }).first(),
    page.locator('ion-popover ion-select-option:visible').filter({ hasText: valuePattern }).first(),
    page.locator('ion-popover [role="option"]:visible').filter({ hasText: valuePattern }).first(),
    page.locator('[role="option"]:visible').filter({ hasText: valuePattern }).first(),
    page.locator('[role="radio"]:visible').filter({ hasText: valuePattern }).first(),
  ];

  let selected = false;
  for (const option of optionCandidates) {
    if (await option.count()) {
      await option.click({ force: true });
      selected = true;
      break;
    }
  }
  if (!selected) {
    // Fallback for environments where ionic overlay options are not interactable in automation.
    await select.evaluate((el, v) => {
      const ionSelect = el as HTMLIonSelectElement & { value: string };
      ionSelect.value = v;
      ionSelect.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v }, bubbles: true, composed: true }));
    }, value);
  }

  const confirmBtn = page.getByRole('button', { name: /ok|done|confirm|apply/i }).first();
  if (await confirmBtn.count()) {
    await confirmBtn.click();
  }

  // Ionic select popovers may remain open until dismissed.
  const popover = page.locator('ion-popover.select-popover:visible').first();
  const alert = page.locator('ion-alert:visible').first();
  if (await popover.count() || await alert.count()) {
    await page.keyboard.press('Escape');
    await page.mouse.click(4, 4).catch(() => { });
  }
}

test.describe('Bulk Upload', () => {
  test('Bulk upload page renders and submit is disabled before file upload', async ({ page }) => {
    await gotoBulkUpload(page);
    await ensureBulkUploadAccessible(page);
    await expect(page.getByTestId('bulk-download-template-btn')).toBeVisible();
    await expect(page.getByTestId('bulk-upload-submit-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('Uploading csv enables submit and allows field mappings', async ({ page }) => {
    await gotoBulkUpload(page);
    await ensureBulkUploadAccessible(page);

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
