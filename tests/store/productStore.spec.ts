import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '@common';
import { useProductStore } from '@/store/productStore';

vi.mock('@common', () => ({
  api: vi.fn(), commonUtil: { hasError: () => false },
  logger: { error: vi.fn() }, translate: (value: string) => value,
}));
vi.mock('@/store/user', () => ({ useUserStore: () => ({ current: { userId: 'test-user' } }) }));

describe('initial product store selection', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.mocked(api).mockReset(); });

  it.each([undefined, 'REMOVED', 'SECOND'])(
    'resolves preference %s to an available store and awaits its dependencies', async (preference) => {
      const store = useProductStore();
      store.productStores = [{ productStoreId: 'FIRST' }, { productStoreId: 'SECOND' }];
      vi.mocked(api).mockResolvedValue({ data: preference ? [{ preferenceValue: preference }] : [] });
      let finish!: () => void;
      const dependencies = vi.spyOn(store, 'fetchProductStoreDependencies').mockImplementation(
        () => new Promise<void>((resolve) => { finish = resolve; })
      );
      let completed = false;
      const selection = store.fetchProductStorePreference().then(() => { completed = true; });
      await vi.waitFor(() => expect(dependencies).toHaveBeenCalled());
      expect(store.getCurrentProductStore.productStoreId).toBe(preference === 'SECOND' ? 'SECOND' : 'FIRST');
      expect(completed).toBe(false);
      finish();
      await selection;
      expect(completed).toBe(true);
    }
  );

  it('selects an available store when preference lookup fails', async () => {
    const store = useProductStore();
    store.productStores = [{ productStoreId: 'FIRST' }];
    vi.mocked(api).mockRejectedValue(new Error('preference unavailable'));
    vi.spyOn(store, 'fetchProductStoreDependencies').mockResolvedValue();
    await store.fetchProductStorePreference();
    expect(store.getCurrentProductStore.productStoreId).toBe('FIRST');
  });

  it('fails initialization when no product store is available', async () => {
    vi.mocked(api).mockResolvedValue({ data: [] });
    await expect(useProductStore().fetchProductStorePreference()).rejects.toThrow('No product store is available.');
  });

  it('does not issue a facilities request before a store is selected', async () => {
    await useProductStore().fetchProductStoreFacilities(undefined as any);
    expect(api).not.toHaveBeenCalled();
    expect(useProductStore().getProductStoreFacilities).toEqual([]);
  });
});
