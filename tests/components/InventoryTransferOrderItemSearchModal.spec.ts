import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';

const dismiss = vi.hoisted(() => vi.fn());
const searchOrderItems = vi.hoisted(() => vi.fn());

vi.mock('@common', () => ({
  translate: (label: string) => label,
  commonUtil: {
    getProductIdentificationValue: (type: string, product: any) => {
      const identification = product.goodIdentifications?.find((value: string) => value.startsWith(`${type}/`));
      return identification?.split('/')[1];
    },
  },
}));
vi.mock('@/store/productStore', () => ({
  useProductStore: () => ({
    getProductIdentificationPref: { primaryId: 'sku', secondaryId: 'upc' },
    getAllFacilities: [{ facilityId: 'SOURCE', facilityName: 'Canoga Park warehouse' }],
  }),
}));
vi.mock('@/composables/useInventoryTransferOrderItemSearch', () => ({
  useInventoryTransferOrderItemSearch: () => ({ searchOrderItems }),
}));
vi.mock('@/components/Image.vue', () => ({
  default: defineComponent({ name: 'ProductImage', props: ['src'], template: '<img :src="src" />' }),
}));
vi.mock('@ionic/vue', () => {
  const component = (name: string, template = '<div><slot name="start"/><slot/><slot name="end"/></div>') =>
    defineComponent({ name, inheritAttrs: true, template });
  return {
    IonButton: component('IonButton', '<button><slot/></button>'),
    IonButtons: component('IonButtons'),
    IonContent: component('IonContent'),
    IonHeader: component('IonHeader'),
    IonIcon: component('IonIcon'),
    IonItem: component('IonItem'),
    IonItemDivider: component('IonItemDivider'),
    IonItemGroup: component('IonItemGroup'),
    IonLabel: component('IonLabel'),
    IonList: component('IonList'),
    IonNote: component('IonNote'),
    IonSearchbar: component('IonSearchbar', '<input/>'),
    IonSpinner: component('IonSpinner'),
    IonThumbnail: component('IonThumbnail'),
    IonTitle: component('IonTitle'),
    IonToolbar: component('IonToolbar'),
    modalController: { dismiss },
  };
});

import InventoryTransferOrderItemSearchModal from '@/components/InventoryTransferOrderItemSearchModal.vue';

const ITEM = {
  orderId: '117042',
  orderName: '#7873CAN',
  orderItemSeqId: '02',
  productId: 'VARIANT_1',
  productName: 'Blue dress',
  sku: 'SKU-1',
  upc: '195692535356',
  goodIdentifications: ['SKU/SKU-1', 'UPCA/195692535356'],
  facilityId: 'SOURCE',
  quantity: 2,
  mainImageUrl: 'product.jpg',
};

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await nextTick();
  }
}

describe('InventoryTransferOrderItemSearchModal', () => {
  beforeEach(() => {
    dismiss.mockReset();
    searchOrderItems.mockReset();
  });

  it('waits for a keyword and presents order-item choices without internal sequence IDs', async () => {
    searchOrderItems.mockResolvedValue({ items: [ITEM], total: 1 });
    const wrapper = mount(InventoryTransferOrderItemSearchModal);

    expect(searchOrderItems).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Search for an order or product');

    wrapper.getComponent({ name: 'IonSearchbar' }).vm.$emit('ionInput', { detail: { value: '7873CAN' } });
    await flush();

    expect(searchOrderItems).toHaveBeenCalledWith('7873CAN');
    expect(wrapper.text()).toContain('#7873CAN');
    expect(wrapper.text()).toContain('Canoga Park warehouse');
    expect(wrapper.text()).toContain('SKU-1');
    expect(wrapper.text()).toContain('195692535356');
    expect(wrapper.text()).toContain('Qty 2');
    expect(wrapper.text()).not.toContain('Item 02');
    expect(wrapper.get('img').attributes('src')).toBe('product.jpg');
  });

  it('returns the selected order item to the create form', async () => {
    searchOrderItems.mockResolvedValue({ items: [ITEM], total: 1 });
    const wrapper = mount(InventoryTransferOrderItemSearchModal);
    wrapper.getComponent({ name: 'IonSearchbar' }).vm.$emit('ionInput', { detail: { value: 'SKU-1' } });
    await flush();

    await wrapper.getComponent({ name: 'IonItem' }).trigger('click');

    expect(dismiss).toHaveBeenCalledWith({ orderItem: ITEM }, 'confirm');
  });

  it('returns an embedded selection without dismissing a second modal', async () => {
    searchOrderItems.mockResolvedValue({ items: [ITEM], total: 1 });
    const wrapper = mount(InventoryTransferOrderItemSearchModal, { props: { embedded: true } });
    wrapper.getComponent({ name: 'IonSearchbar' }).vm.$emit('ionInput', { detail: { value: 'SKU-1' } });
    await flush();

    await wrapper.getComponent({ name: 'IonItem' }).trigger('click');

    expect(wrapper.emitted('select')?.[0]).toEqual([ITEM]);
    expect(dismiss).not.toHaveBeenCalled();
  });
});
