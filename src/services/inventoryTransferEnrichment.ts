import { commonUtil, useSolrSearch } from '@common';

function escapeSolrValue(value: string) {
  return String(value).replace(/([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');
}

export function buildInventoryTransferOrderEnrichmentPayload(orderIds: readonly string[]) {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  return {
    json: {
      params: {
        rows: uniqueOrderIds.length,
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
        `orderId:(${uniqueOrderIds.map(escapeSolrValue).join(' OR ')})`,
      ],
    },
  };
}

export function normalizeInventoryTransferOrderNames(data: any): Record<string, string> {
  const groups = (data?.response || data)?.grouped?.orderId?.groups || [];
  return groups.reduce((orderNames: Record<string, string>, group: any) => {
    const document = group?.doclist?.docs?.[0];
    const orderId = String(group?.groupValue || document?.orderId || '').trim();
    if (orderId) orderNames[orderId] = String(document?.orderName || orderId);
    return orderNames;
  }, {});
}

export async function fetchInventoryTransferOrderNames(orderIds: readonly string[]) {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (!uniqueOrderIds.length) return {};
  const response = await useSolrSearch().runSolrQuery(
    buildInventoryTransferOrderEnrichmentPayload(uniqueOrderIds),
  );
  if (commonUtil.hasError(response)) throw response.data;
  return normalizeInventoryTransferOrderNames(response.data);
}
