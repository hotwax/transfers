import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const view = readFileSync(resolve(process.cwd(), 'src/views/InventoryTransfers.vue'), 'utf8');
const row = readFileSync(resolve(process.cwd(), 'src/components/InventoryTransferRow.vue'), 'utf8');
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

  it('uses immediate filters, with order and product selected by lookup', () => {
    for (const field of ['inventoryTransferId', 'orderId', 'facilityId', 'facilityIdTo', 'statusId']) {
      expect(view).toContain(field);
    }
    expect(view).not.toContain('v-model="filters.orderItemSeqId"');
    expect(view).not.toContain('v-model="filters.productId"');
    expect(view).not.toContain('Apply filters');
    expect(view).toContain('component: InventoryTransferOrderLookupModal');
    expect(view).toContain('component: InventoryTransferProductSearchModal');
    expect(view).toContain("setFilter('orderId', data.orderId)");
    expect(orderLookup).toContain("url: 'oms/orders'");
    expect(orderLookup).toContain("modalController.dismiss({ orderId: order.orderId }, 'confirm')");
  });

  it('creates a single line and exposes single and bulk actions only for requested transfers', () => {
    expect(modal).toContain('createInventoryTransfer');
    expect(modal).toContain('facilityIdTo');
    expect(modal).toContain('facilityId.value === facilityIdTo.value');
    expect(row).toContain("props.transfer.statusId === 'IXF_REQUESTED'");
    expect(view).toContain('executeInventoryTransfer(transfer.inventoryTransferId)');
    expect(view).toContain('cancelInventoryTransfer(transfer.inventoryTransferId)');
    expect(view).toContain('executeSelectedInventoryTransfers');
    expect(view).toContain('cancelSelectedInventoryTransfers');
    expect(view).toContain('selectedTransferIds');
    expect(view).not.toContain('Add item');
  });

  it('enriches the list with product identifiers, product images, and sales-order names', () => {
    expect(view).toContain('getProductIdentificationPref.primaryId');
    expect(view).toContain('details.sku');
    expect(view).toContain('fetchInventoryTransferOrderNames');
    expect(row).toContain('<Image :src="imageUrl" />');
    expect(row).toContain("translate('Transfer')");
    expect(row).toContain('<ion-note slot="end" class="quantity">');
  });
});
