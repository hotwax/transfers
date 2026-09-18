import { defineStore } from 'pinia';
import { api, commonUtil, logger } from '@common';

export type InventoryTransferFilters = {
  inventoryTransferId: string;
  orderId: string;
  productId: string;
  facilityId: string;
  facilityIdTo: string;
  statusId: string;
};

const defaultFilters = (): InventoryTransferFilters => ({
  inventoryTransferId: '',
  orderId: '',
  productId: '',
  facilityId: '',
  facilityIdTo: '',
  statusId: 'IXF_REQUESTED',
});

function responseRows(data: any) {
  return Array.isArray(data) ? data : data?.inventoryTransfers ?? data?.docs ?? data?.list ?? [];
}

export const useInventoryTransferStore = defineStore('inventoryTransfer', {
  state: () => ({
    transfers: [] as any[],
    filters: defaultFilters(),
    isFetching: false,
    hasMore: false,
  }),
  actions: {
    async fetchInventoryTransfers({ pageIndex = 0, pageSize = 20, append = false } = {}) {
      this.isFetching = pageIndex === 0;
      const params: Record<string, any> = { orderBy: '-createdStamp', pageIndex, pageSize };
      Object.entries(this.filters).forEach(([field, value]) => {
        if (value !== '') params[field] = value;
      });

      try {
        const response: any = await api({ url: 'oms/inventoryTransfers', method: 'GET', params });
        if (commonUtil.hasError(response)) throw response.data;
        const rows = responseRows(response.data);
        this.transfers = append ? [...this.transfers, ...rows] : rows;
        this.hasMore = rows.length === pageSize;
        return rows;
      } catch (error) {
        logger.error('Failed to fetch inventory transfers', error);
        throw error;
      } finally {
        this.isFetching = false;
      }
    },
    setFilter(field: keyof InventoryTransferFilters, value: string) {
      this.filters[field] = value;
    },
    resetFilters() {
      this.filters = defaultFilters();
    },
    async createInventoryTransfer(transfer: Record<string, any>) {
      return api({
        url: 'oms/inventoryTransfers',
        method: 'POST',
        data: {
          ...transfer,
          statusId: 'IXF_REQUESTED',
          sourceId: 'TRANSFERS_APP',
          sourceReferenceId: transfer.sourceReferenceId || `TRANSFERS_APP-${Date.now()}`,
        },
      });
    },
    async executeInventoryTransfer(inventoryTransferId: string) {
      return api({
        url: `oms/inventoryTransfers/${inventoryTransferId}/execute`,
        method: 'POST',
        data: { inventoryTransferId },
      });
    },
    async cancelInventoryTransfer(inventoryTransferId: string) {
      const response: any = await api({
        url: `oms/inventoryTransfers/${inventoryTransferId}/cancel`,
        method: 'POST',
        data: { inventoryTransferId, statusReasonEnumId: 'IXF_USER_CANCEL' },
      });
      if (commonUtil.hasError(response)) throw response.data;

      const transfer = this.transfers.find((item) => item.inventoryTransferId === inventoryTransferId);
      if (transfer) transfer.statusId = 'IXF_CANCELLED';
      return response;
    },
    async executeInventoryTransfers(inventoryTransferIds: string[]) {
      const results = await Promise.allSettled(
        inventoryTransferIds.map((inventoryTransferId) => this.executeInventoryTransfer(inventoryTransferId)),
      );
      return results.reduce((summary, result, index) => {
        const bucket = result.status === 'fulfilled' ? summary.succeeded : summary.failed;
        bucket.push(inventoryTransferIds[index]);
        return summary;
      }, { succeeded: [] as string[], failed: [] as string[] });
    },
    async cancelInventoryTransfers(inventoryTransferIds: string[]) {
      const results = await Promise.allSettled(
        inventoryTransferIds.map((inventoryTransferId) => this.cancelInventoryTransfer(inventoryTransferId)),
      );
      return results.reduce((summary, result, index) => {
        const bucket = result.status === 'fulfilled' ? summary.succeeded : summary.failed;
        bucket.push(inventoryTransferIds[index]);
        return summary;
      }, { succeeded: [] as string[], failed: [] as string[] });
    },
  },
});
