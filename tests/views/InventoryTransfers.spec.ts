import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const view = readFileSync(resolve(process.cwd(), 'src/views/InventoryTransfers.vue'), 'utf8');
const modal = readFileSync(resolve(process.cwd(), 'src/components/InventoryTransferModal.vue'), 'utf8');
const orderLookup = readFileSync(resolve(process.cwd(), 'src/components/InventoryTransferOrderLookupModal.vue'), 'utf8');
const router = readFileSync(resolve(process.cwd(), 'src/router/index.ts'), 'utf8');
const tabs = readFileSync(resolve(process.cwd(), 'src/views/Tabs.vue'), 'utf8');

describe('inventory transfer list', () => {
  it('is a separate list-only tab with no detail route', () => {
    expect(router).toContain('path: "inventory-transfers"');
    expect(router).toContain('import("@/views/InventoryTransfers.vue")');
    expect(tabs).toContain('href="/tabs/inventory-transfers"');
    expect(router).not.toContain('inventory-transfers/:inventoryTransferId');
  });

  it('shows line fields and exact filters, with order selected by lookup', () => {
    for (const field of ['inventoryTransferId', 'orderId', 'orderItemSeqId', 'productId', 'facilityId', 'facilityIdTo', 'statusId']) {
      expect(view).toContain(field);
    }
    expect(view).toContain('component: InventoryTransferOrderLookupModal');
    expect(view).toContain("setFilter('orderId', data.orderId)");
    expect(orderLookup).toContain("url: 'oms/orders'");
    expect(orderLookup).toContain("modalController.dismiss({ orderId: order.orderId }, 'confirm')");
  });

  it('creates a single line and exposes only requested execute/cancel actions', () => {
    expect(modal).toContain('createInventoryTransfer');
    expect(modal).toContain('facilityIdTo');
    expect(modal).toContain('facilityId.value === facilityIdTo.value');
    expect(view).toContain("transfer.statusId === 'IXF_REQUESTED'");
    expect(view).toContain('executeInventoryTransfer(transfer.inventoryTransferId)');
    expect(view).toContain('cancelInventoryTransfer(transfer.inventoryTransferId)');
    expect(view).not.toContain('Add item');
  });
});
