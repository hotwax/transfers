import { commonUtil, logger, useSolrSearch } from '@common';
import { useProductStore } from '@/store/productStore';
import { useInventoryTransferProductSearch } from '@/composables/useInventoryTransferProductSearch';

export interface InventoryTransferOrderItemSummary {
  orderId: string;
  orderName?: string;
  orderItemSeqId: string;
  productId: string;
  facilityId?: string;
  productName?: string;
  internalName?: string;
  sku?: string;
  upc?: string;
  goodIdentifications?: any[];
  quantity?: number;
  mainImageUrl?: string;
}

const SEARCH_FIELDS = [
  'orderId^20',
  'orderName^20',
  'externalOrderId^15',
  'productId^10',
  'productName^8',
  'internalName^8',
  'parentProductName^6',
  'sku^10',
  'goodIdentifications^8',
].join(' ');

const RESULT_FIELDS = [
  'orderId',
  'orderName',
  'orderItemSeqId',
  'productId',
  'facilityId',
  'productName',
  'internalName',
  'sku',
  'quantity',
  'mainImageUrl',
].join(' ');

function firstValue(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: any) {
  const candidate = firstValue(value);
  return candidate === undefined || candidate === null ? '' : String(candidate);
}

function docsOf(response: any) {
  return response?.data?.response?.docs || [];
}

function toSummary(document: any): InventoryTransferOrderItemSummary {
  return {
    orderId: stringValue(document.orderId),
    orderName: stringValue(document.orderName),
    orderItemSeqId: stringValue(document.orderItemSeqId),
    productId: stringValue(document.productId),
    facilityId: stringValue(document.facilityId),
    productName: stringValue(document.productName),
    internalName: stringValue(document.internalName),
    sku: stringValue(document.sku),
    quantity: Number(firstValue(document.quantity) || 0),
    mainImageUrl: stringValue(document.mainImageUrl),
  };
}

export function useInventoryTransferOrderItemSearch() {
  const { runSolrQuery } = useSolrSearch();
  const { fetchSummaries } = useInventoryTransferProductSearch();

  async function searchOrderItems(keyword: string, { pageSize = 50 } = {}) {
    const trimmed = keyword.trim();
    if (!trimmed) return { items: [] as InventoryTransferOrderItemSummary[], total: 0 };

    const filters = ['docType:ORDER', 'orderTypeId:SALES_ORDER'];
    const productStoreId = (useProductStore().getCurrentProductStore as any)?.productStoreId;
    if (productStoreId) filters.push(`productStoreId:"${productStoreId}"`);

    try {
      const response: any = await runSolrQuery({
        json: {
          query: `${trimmed}*`,
          filter: filters,
          params: {
            rows: pageSize * 4,
            sort: 'orderDate desc',
            defType: 'edismax',
            qf: SEARCH_FIELDS,
            fl: RESULT_FIELDS,
          },
          collection: 'enterpriseSearch',
        },
      });
      if (commonUtil.hasError(response)) throw response.data;

      const items: InventoryTransferOrderItemSummary[] = [];
      const seen = new Set<string>();
      docsOf(response).forEach((document: any) => {
        const item = toSummary(document);
        const key = `${item.orderId}:${item.orderItemSeqId}:${item.facilityId}`;
        if (!item.orderId || !item.orderItemSeqId || !item.productId || seen.has(key) || items.length >= pageSize) return;
        seen.add(key);
        items.push(item);
      });

      let productSummaries = {} as Awaited<ReturnType<typeof fetchSummaries>>;
      try {
        productSummaries = await fetchSummaries([...new Set(items.map((item) => item.productId))]);
      } catch (error) {
        logger.error('Failed to enrich inventory transfer order items with product details', error);
      }

      const enrichedItems = items.map((item) => {
        const product = productSummaries[item.productId];
        if (!product) return item;
        return {
          ...item,
          productName: product.productName || item.productName,
          internalName: product.internalName || item.internalName,
          sku: product.sku || item.sku,
          upc: product.upc || item.upc,
          goodIdentifications: product.goodIdentifications || item.goodIdentifications,
          mainImageUrl: product.mainImageUrl || item.mainImageUrl,
        };
      });
      return { items: enrichedItems, total: enrichedItems.length };
    } catch (error) {
      logger.error('Failed to search inventory transfer order items', error);
      return { items: [] as InventoryTransferOrderItemSummary[], total: 0 };
    }
  }

  return { searchOrderItems };
}
