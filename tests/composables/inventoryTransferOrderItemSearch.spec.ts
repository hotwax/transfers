import { beforeEach, describe, expect, it, vi } from 'vitest';

const runSolrQuery = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());
const currentProductStore = vi.hoisted(() => ({ value: { productStoreId: 'STORE_1' } as any }));

vi.mock('@common', () => ({
  useSolrSearch: () => ({ runSolrQuery }),
  commonUtil: { hasError: vi.fn(() => false) },
  logger: { error: loggerError },
}));

vi.mock('@/store/productStore', () => ({
  useProductStore: () => ({ getCurrentProductStore: currentProductStore.value }),
}));

import { useInventoryTransferOrderItemSearch } from '@/composables/useInventoryTransferOrderItemSearch';

const solr = (docs: any[], numFound = docs.length) => ({ data: { response: { docs, numFound } } });

describe('useInventoryTransferOrderItemSearch', () => {
  beforeEach(() => {
    runSolrQuery.mockReset();
    loggerError.mockReset();
    currentProductStore.value = { productStoreId: 'STORE_1' };
  });

  it('searches sales-order item documents by order and product keywords in the selected store', async () => {
    runSolrQuery
      .mockResolvedValueOnce(solr([
        {
          orderId: '117042', orderName: '#7873CAN', orderItemSeqId: '02',
          productId: 'VARIANT_1', productName: 'XS', sku: 'XS', quantity: 2, facilityId: 'SOURCE',
        },
      ]))
      .mockResolvedValueOnce(solr([
        {
          productId: 'VARIANT_1', productName: 'Blue dress', sku: '927-684-82968296:XS',
          upc: '195692535356',
          goodIdentifications: ['SKU/927-684-82968296:XS', 'UPCA/195692535356'],
        },
      ]));

    const result = await useInventoryTransferOrderItemSearch().searchOrderItems('7873CAN');

    expect(runSolrQuery).toHaveBeenCalledTimes(2);
    const payload = runSolrQuery.mock.calls[0][0].json;
    expect(payload.query).toBe('7873CAN*');
    expect(payload.filter).toEqual([
      'docType:ORDER',
      'orderTypeId:SALES_ORDER',
      'productStoreId:"STORE_1"',
    ]);
    expect(payload.params.defType).toBe('edismax');
    expect(payload.params.qf).toContain('orderName');
    expect(payload.params.qf).toContain('productId');
    expect(result.items).toEqual([
      expect.objectContaining({
        orderId: '117042', orderItemSeqId: '02', productId: 'VARIANT_1', sku: '927-684-82968296:XS',
        facilityId: 'SOURCE',
        upc: '195692535356',
        goodIdentifications: ['SKU/927-684-82968296:XS', 'UPCA/195692535356'],
      }),
    ]);
  });

  it('keeps the same order item selectable at each current location', async () => {
    runSolrQuery.mockResolvedValue(solr([
      {
        orderId: '117042', orderName: '#7873CAN', orderItemSeqId: '02', productId: 'VARIANT_1',
        productName: 'Blue dress', sku: 'SKU-1', quantity: 1, facilityId: 'FACILITY_A',
      },
      {
        orderId: '117042', orderName: '#7873CAN', orderItemSeqId: '02', productId: 'VARIANT_1',
        productName: 'Blue dress', sku: 'SKU-1', quantity: 1, facilityId: 'FACILITY_B',
      },
    ]));

    const result = await useInventoryTransferOrderItemSearch().searchOrderItems('SKU-1');

    expect(result.items.map((item) => item.facilityId)).toEqual(['FACILITY_A', 'FACILITY_B']);
  });

  it('waits for a keyword before querying Solr', async () => {
    const result = await useInventoryTransferOrderItemSearch().searchOrderItems('  ');

    expect(runSolrQuery).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0 });
  });
});
