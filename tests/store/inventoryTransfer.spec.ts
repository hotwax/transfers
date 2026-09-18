import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '@common';
import { useInventoryTransferStore } from '@/store/inventoryTransfer';

vi.mock('@common', () => ({
  api: vi.fn(),
  commonUtil: { hasError: vi.fn(() => false) },
  logger: { error: vi.fn() },
}));

describe('inventory transfer store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api).mockReset();
  });

  it('lists requested transfers newest first by default', async () => {
    vi.mocked(api).mockResolvedValue({ data: [{ inventoryTransferId: '1001' }] });
    const store = useInventoryTransferStore();

    await store.fetchInventoryTransfers();

    expect(api).toHaveBeenCalledWith({
      url: 'oms/inventoryTransfers', method: 'GET', params: {
        statusId: 'IXF_REQUESTED', orderBy: '-createdStamp', pageIndex: 0, pageSize: 20,
      },
    });
    expect(store.transfers).toEqual([{ inventoryTransferId: '1001' }]);
  });

  it('passes every selected filter as an exact entity parameter', async () => {
    vi.mocked(api).mockResolvedValue({ data: [] });
    const store = useInventoryTransferStore();
    Object.assign(store.filters, {
      inventoryTransferId: '1001', orderId: 'ORDER_1', productId: 'P1',
      facilityId: 'SOURCE', facilityIdTo: 'DEST', statusId: 'IXF_COMPLETE',
    });

    await store.fetchInventoryTransfers();

    expect(api).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({
      inventoryTransferId: '1001', orderId: 'ORDER_1', productId: 'P1',
      facilityId: 'SOURCE', facilityIdTo: 'DEST', statusId: 'IXF_COMPLETE',
    }) }));
    const params = vi.mocked(api).mock.calls[0][0].params;
    expect(params).not.toHaveProperty('orderItemSeqId');
    expect(Object.keys(params).some((key) => key.endsWith('_op'))).toBe(false);
  });

  it('executes selected transfers independently and reports partial failures', async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ data: { inventoryTransferId: '1001' } })
      .mockRejectedValueOnce(new Error('inventory adjustment failed'));
    const store = useInventoryTransferStore();

    const result = await store.executeInventoryTransfers(['1001', '1002']);

    expect(result).toEqual({ succeeded: ['1001'], failed: ['1002'] });
    expect(api).toHaveBeenNthCalledWith(1, {
      url: 'oms/inventoryTransfers/1001/execute', method: 'POST', data: { inventoryTransferId: '1001' },
    });
    expect(api).toHaveBeenNthCalledWith(2, {
      url: 'oms/inventoryTransfers/1002/execute', method: 'POST', data: { inventoryTransferId: '1002' },
    });
  });

  it('cancels selected transfers with the user-cancel reason', async () => {
    vi.mocked(api).mockResolvedValue({ data: {} });
    const store = useInventoryTransferStore();

    const result = await store.cancelInventoryTransfers(['1001', '1002']);

    expect(result).toEqual({ succeeded: ['1001', '1002'], failed: [] });
    expect(api).toHaveBeenNthCalledWith(1, {
      url: 'oms/inventoryTransfers/1001/cancel', method: 'POST', data: {
        inventoryTransferId: '1001', statusReasonEnumId: 'IXF_USER_CANCEL',
      },
    });
  });

  it('updates only the cancelled transfer in place after the request succeeds', async () => {
    vi.mocked(api).mockResolvedValue({ data: { inventoryTransferId: '1001' } });
    const store = useInventoryTransferStore();
    store.transfers = [
      { inventoryTransferId: '1001', statusId: 'IXF_REQUESTED' },
      { inventoryTransferId: '1002', statusId: 'IXF_REQUESTED' },
    ];
    const originalTransfers = store.transfers;
    const untouchedTransfer = store.transfers[1];

    await store.cancelInventoryTransfer('1001');

    expect(store.transfers).toBe(originalTransfers);
    expect(store.transfers[0].statusId).toBe('IXF_CANCELLED');
    expect(store.transfers[1]).toBe(untouchedTransfer);
    expect(store.transfers[1].statusId).toBe('IXF_REQUESTED');
  });

  it('does not update the transfer when cancellation fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('cancel failed'));
    const store = useInventoryTransferStore();
    store.transfers = [{ inventoryTransferId: '1001', statusId: 'IXF_REQUESTED' }];

    await expect(store.cancelInventoryTransfer('1001')).rejects.toThrow('cancel failed');

    expect(store.transfers[0].statusId).toBe('IXF_REQUESTED');
  });

  it('creates, executes, and cancels one line through the inventory transfer endpoints', async () => {
    vi.mocked(api).mockResolvedValue({ data: { inventoryTransferId: '1001' } });
    const store = useInventoryTransferStore();

    await store.createInventoryTransfer({ productId: 'P1', quantity: 2, facilityId: 'SOURCE', facilityIdTo: 'DEST' });
    await store.executeInventoryTransfer('1001');
    await store.cancelInventoryTransfer('1001');

    expect(api).toHaveBeenNthCalledWith(1, {
      url: 'oms/inventoryTransfers', method: 'POST', data: expect.objectContaining({
        statusId: 'IXF_REQUESTED', sourceId: 'TRANSFERS_APP', productId: 'P1', quantity: 2,
      }),
    });
    expect(api).toHaveBeenNthCalledWith(2, {
      url: 'oms/inventoryTransfers/1001/execute', method: 'POST', data: { inventoryTransferId: '1001' },
    });
    expect(api).toHaveBeenNthCalledWith(3, {
      url: 'oms/inventoryTransfers/1001/cancel', method: 'POST', data: {
        inventoryTransferId: '1001', statusReasonEnumId: 'IXF_USER_CANCEL',
      },
    });
  });
});
