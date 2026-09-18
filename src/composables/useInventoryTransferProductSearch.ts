import { logger, useSolrSearch } from '@common';
import { useProductStore } from '@/store/productStore';

export interface InventoryTransferProductSummary {
  productId: string;
  productName?: string;
  parentProductName?: string;
  internalName?: string;
  sku?: string;
  upc?: string;
  goodIdentifications?: any[];
  mainImageUrl?: string;
  groupId?: string;
}

const KEYWORD_FIELDS = 'productId productName internalName sku upc goodIdentifications parentProductName groupName keywordSearchText';

function docsOf(response: any) {
  return response?.data?.response?.docs || [];
}

function numFoundOf(response: any) {
  return response?.data?.response?.numFound || 0;
}

function toSummary(product: any): InventoryTransferProductSummary {
  return {
    productId: product.productId,
    productName: product.productName,
    parentProductName: product.parentProductName,
    internalName: product.internalName,
    sku: product.sku,
    upc: product.upc,
    goodIdentifications: product.goodIdentifications,
    mainImageUrl: product.mainImageUrl,
    groupId: product.groupId,
  };
}

export function useInventoryTransferProductSearch() {
  const { runSolrQuery } = useSolrSearch();

  function storeScope() {
    const productStoreId = (useProductStore().getCurrentProductStore as any)?.productStoreId;
    return productStoreId ? [`productStoreIds:"${productStoreId}"`] : [];
  }

  function query(filter: string[], params: Record<string, any>) {
    return runSolrQuery({
      json: { query: '*:*', filter, params, collection: 'enterpriseSearch' },
    });
  }

  async function fetchSummaries(productIds: string[]) {
    if (!productIds.length) return {} as Record<string, InventoryTransferProductSummary>;
    const response = await query(
      ['docType:PRODUCT', `productId:(${productIds.join(' OR ')})`],
      {
        rows: productIds.length,
        fl: 'productId productName parentProductName internalName sku upc goodIdentifications mainImageUrl groupId',
      },
    );
    return docsOf(response).reduce((summaries: Record<string, InventoryTransferProductSummary>, product: any) => {
      summaries[product.productId] = toSummary(product);
      return summaries;
    }, {});
  }

  async function searchStyles(keyword: string, { pageSize = 25 } = {}) {
    const trimmed = keyword?.trim();
    try {
      if (!trimmed) {
        const response = await query(
          ['docType:PRODUCT', 'isVirtual:true', ...storeScope()],
          { rows: pageSize },
        );
        return { styles: docsOf(response).map(toSummary), total: numFoundOf(response) };
      }

      const response = await runSolrQuery({
        json: {
          query: `${trimmed}*`,
          filter: ['docType:PRODUCT', ...storeScope()],
          params: { rows: pageSize * 10, defType: 'edismax', qf: KEYWORD_FIELDS, fl: 'productId,groupId' },
          collection: 'enterpriseSearch',
        },
      });
      const styleIds: string[] = [];
      docsOf(response).forEach((product: any) => {
        const styleId = product.groupId || product.productId;
        if (styleId && !styleIds.includes(styleId)) styleIds.push(styleId);
      });
      const visibleStyleIds = styleIds.slice(0, pageSize);
      const summaries = await fetchSummaries(visibleStyleIds);
      return {
        styles: visibleStyleIds.map((productId) => summaries[productId]).filter(Boolean),
        total: styleIds.length,
      };
    } catch (error) {
      logger.error('Failed to search inventory transfer products', error);
      return { styles: [], total: 0 };
    }
  }

  async function fetchVariants(groupId: string, { pageSize = 200 } = {}) {
    if (!groupId) return { variants: [], total: 0 };
    try {
      const response = await query(
        ['docType:PRODUCT', 'isVariant:true', `groupId:${groupId}`, ...storeScope()],
        { rows: pageSize, sort: 'productId asc' },
      );
      return { variants: docsOf(response).map(toSummary), total: numFoundOf(response) };
    } catch (error) {
      logger.error('Failed to load inventory transfer product variants', error);
      return { variants: [], total: 0 };
    }
  }

  return { searchStyles, fetchVariants, fetchSummaries };
}
