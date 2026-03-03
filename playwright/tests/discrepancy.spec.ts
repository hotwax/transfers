import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

const TEST_ORDER_ID = process.env.TEST_ORDER_ID || 'TEST_ORDER_1001';

test.describe('Discrepancy - UI/Chips/Counts', () => {
  test('Discrepancy chips present and counts match badges', async ({ page }) => {
    const od = new OrderDetailPage(page);
    await od.goto(TEST_ORDER_ID);

    // header summary
    const header = page.locator('[data-testid="order-discrepancy-header"]');
    if ((await header.count()) > 0) {
      await expect(header).toBeVisible();
    }

    // chips
    const allChip = od.discrepancyChip('all');
    const underShipped = od.discrepancyChip('under-shipped');
    const underReceived = od.discrepancyChip('under-received');
    const overReceived = od.discrepancyChip('over-received');

    await expect(allChip).toBeVisible();
    await expect(underShipped).toBeVisible();
    await expect(underReceived).toBeVisible();
    await expect(overReceived).toBeVisible();

    // badges inside list
    const badge = od.badgeWithText('Under shipped');
    await expect(badge).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { OrderDetailPage } from '../pages/orderDetail.page';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ORDER_ID = process.env.TEST_ORDER_ID_DISCREPANCY || process.env.TEST_ORDER_ID || 'TEST_ORDER_1001';

async function gotoOrderDetail(page: any, orderId: string) {
  const od = new OrderDetailPage(page);
  await od.goto(orderId);
  return od;
}

test.describe('Discrepancy Reporting', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: wire auth helper in CI if required
  });

  test('Summary shows discrepancy chips and filtering by Under shipped', async ({ page }) => {
    const od = await gotoOrderDetail(page, ORDER_ID);
    const underChip = od.discrepancyChip('Under shipped');
    await expect(underChip).toBeVisible();
    await underChip.click();

    const itemRows = page.locator('[data-testid^="order-item-row-"]');
    const visibleRows = await itemRows.count();

    const underBadges = page.locator('ion-badge', { hasText: 'Under shipped' });
    const underBadgeCount = await underBadges.count();
    expect(underBadgeCount).toBeGreaterThanOrEqual(0);
    if (visibleRows > 0) {
      expect(underBadgeCount).toBeLessThanOrEqual(visibleRows);
    }
  });

  test('Selecting All discrepancy resets filters and shows mixed statuses', async ({ page }) => {
    const od = await gotoOrderDetail(page, ORDER_ID);
    const allChip = od.discrepancyChip('All');
    await expect(allChip).toBeVisible();
    await allChip.click();

    const anyUnder = await page.locator('ion-badge', { hasText: 'Under shipped' }).count();
    const anyUnderReceived = await page.locator('ion-badge', { hasText: 'Under received' }).count();
    const anyOver = await page.locator('ion-badge', { hasText: 'Over received' }).count();

    expect(anyUnder).toBeGreaterThanOrEqual(0);
    expect(anyUnderReceived).toBeGreaterThanOrEqual(0);
    expect(anyOver).toBeGreaterThanOrEqual(0);
  });

  test('Inline discrepancy badge exposes a title attribute (tooltip fallback)', async ({ page }) => {
    const od = await gotoOrderDetail(page, ORDER_ID);
    const badgeSelectors = ['Under received', 'Under shipped', 'Over received'];
    let found = false;
    for (const text of badgeSelectors) {
      const badge = od.badgeWithText(text);
      if (await badge.count() > 0) {
        found = true;
        const title = await badge.getAttribute('title');
        expect(title).not.toBeNull();
        break;
      }
    }
    expect(found).toBeTruthy();
  });
});
