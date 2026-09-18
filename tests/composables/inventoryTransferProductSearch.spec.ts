import { beforeEach, describe, expect, it, vi } from 'vitest';

const runSolrQuery = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());
const currentProductStore = vi.hoisted(() => ({ value: { productStoreId: 'STORE_1' } as any }));

vi.mock('@common', () => ({
  useSolrSearch: () => ({ runSolrQuery }),
  logger: { error: loggerError },
}));

vi.mock('@/store/productStore', () => ({
  useProductStore: () => ({ getCurrentProductStore: currentProductStore.value }),
}));

import { useInventoryTransferProductSearch } from '@/composables/useInventoryTransferProductSearch';

const solr = (docs: any[], numFound = docs.length) => ({ data: { response: { docs, numFound } } });

describe('useInventoryTransferProductSearch', () => {
  beforeEach(() => {
    runSolrQuery.mockReset();
    loggerError.mockReset();
    currentProductStore.value = { productStoreId: 'STORE_1' };
  });

  it('finds a style from a variant identifier and scopes the search to the selected store', async () => {
    runSolrQuery.mockResolvedValueOnce(solr([{ productId: 'VARIANT_1', groupId: 'STYLE_1' }]));
    runSolrQuery.mockResolvedValueOnce(solr([{ productId: 'STYLE_1', productName: 'A style' }]));

    const result = await useInventoryTransferProductSearch().searchStyles('SKU-100');

    expect(runSolrQuery.mock.calls[0][0].json.filter).toEqual([
      'docType:PRODUCT',
      'productStoreIds:"STORE_1"',
    ]);
    expect(runSolrQuery.mock.calls[0][0].json.params.qf).toContain('goodIdentifications');
    expect(runSolrQuery.mock.calls[1][0].json.params.fl).toContain('goodIdentifications');
    expect(result.styles).toEqual([expect.objectContaining({ productId: 'STYLE_1' })]);
  });

  it('lists only variants from the selected style and store', async () => {
    runSolrQuery.mockResolvedValueOnce(solr([{ productId: 'VARIANT_1', groupId: 'STYLE_1' }]));

    const result = await useInventoryTransferProductSearch().fetchVariants('STYLE_1');

    expect(runSolrQuery.mock.calls[0][0].json.filter).toEqual([
      'docType:PRODUCT',
      'isVariant:true',
      'groupId:STYLE_1',
      'productStoreIds:"STORE_1"',
    ]);
    expect(result.variants).toEqual([expect.objectContaining({ productId: 'VARIANT_1' })]);
  });
});
