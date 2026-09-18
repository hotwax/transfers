import { beforeEach, describe, expect, it, vi } from 'vitest';

const runSolrQuery = vi.hoisted(() => vi.fn());

vi.mock('@common', () => ({
  commonUtil: { hasError: () => false },
  useSolrSearch: () => ({ runSolrQuery }),
}));

import {
  buildInventoryTransferOrderEnrichmentPayload,
  fetchInventoryTransferOrderNames,
  normalizeInventoryTransferOrderNames,
} from '@/services/inventoryTransferEnrichment';

describe('inventory transfer order enrichment', () => {
  beforeEach(() => runSolrQuery.mockReset());

  it('builds one grouped Solr query for the unique linked sales orders', () => {
    expect(buildInventoryTransferOrderEnrichmentPayload(['117042', '117042', '', '112034'])).toEqual({
      json: {
        params: {
          rows: 2,
          start: 0,
          group: true,
          'group.field': 'orderId',
          'group.limit': 1,
          'group.ngroups': true,
          'q.op': 'AND',
          fl: 'orderId orderName',
        },
        query: '*:*',
        filter: [
          'docType: ORDER',
          'orderTypeId: SALES_ORDER',
          'orderId:(117042 OR 112034)',
        ],
      },
    });
  });

  it('normalizes grouped Solr documents into an order-name lookup', () => {
    expect(normalizeInventoryTransferOrderNames({
      grouped: {
        orderId: {
          groups: [
            { groupValue: '117042', doclist: { docs: [{ orderId: '117042', orderName: 'R117042' }] } },
            { groupValue: '112034', doclist: { docs: [{ orderId: '112034' }] } },
          ],
        },
      },
    })).toEqual({ 117042: 'R117042', 112034: '112034' });
  });

  it('normalizes the response envelope returned by the shared Solr proxy', () => {
    expect(normalizeInventoryTransferOrderNames({
      response: {
        grouped: {
          orderId: {
            groups: [
              { groupValue: '117042', doclist: { docs: [{ orderName: '#7873CAN' }] } },
            ],
          },
        },
      },
    })).toEqual({ 117042: '#7873CAN' });
  });

  it('returns the enriched order-name map from one Solr request', async () => {
    runSolrQuery.mockResolvedValue({
      data: {
        grouped: {
          orderId: {
            groups: [{ groupValue: '117042', doclist: { docs: [{ orderName: 'R117042' }] } }],
          },
        },
      },
    });

    await expect(fetchInventoryTransferOrderNames(['117042'])).resolves.toEqual({ 117042: 'R117042' });
    expect(runSolrQuery).toHaveBeenCalledOnce();
  });
});
