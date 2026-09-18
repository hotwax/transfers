import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';

const createOverlay = vi.hoisted(() => vi.fn());
const dismiss = vi.hoisted(() => vi.fn());
const createInventoryTransfer = vi.hoisted(() => vi.fn());

vi.mock('@common', () => ({ translate: (label: string) => label }));
vi.mock('@/store/inventoryTransfer', () => ({
  useInventoryTransferStore: () => ({ createInventoryTransfer }),
}));
vi.mock('@/store/productStore', () => ({
  useProductStore: () => ({
    getAllFacilities: [
      { facilityId: 'SOURCE', facilityName: 'Source facility' },
      { facilityId: 'DESTINATION', facilityName: 'Destination facility' },
    ],
  }),
}));
vi.mock('@/components/InventoryTransferProductSearchModal.vue', () => ({
  default: defineComponent({
    name: 'InventoryTransferProductSearchModal',
    props: { embedded: Boolean, selectedProductId: String, selectionMode: Boolean },
    emits: ['close', 'select'],
    template: '<div data-testid="embedded-product-search" />',
  }),
}));
vi.mock('@/components/InventoryTransferOrderItemSearchModal.vue', () => ({
  default: defineComponent({
    name: 'InventoryTransferOrderItemSearchModal',
    props: { embedded: Boolean },
    emits: ['close', 'select'],
    template: '<div data-testid="embedded-order-item-search" />',
  }),
}));
vi.mock('@ionic/vue', () => {
  const component = (name: string, template = '<div><slot name="start"/><slot name="label"/><slot/><slot name="end"/></div>') =>
    defineComponent({ name, inheritAttrs: true, template });
  const formControl = (name: string, tag: string) => defineComponent({
    name,
    inheritAttrs: false,
    props: { label: String, required: Boolean, modelValue: null },
    template: `<div><label>{{ label }}<slot name="label"/></label><${tag} :required="required"/></div>`,
  });
  return {
    IonButton: component('IonButton', '<button><slot/></button>'),
    IonButtons: component('IonButtons'),
    IonContent: component('IonContent'),
    IonFab: component('IonFab'),
    IonFabButton: component('IonFabButton', '<button><slot/></button>'),
    IonHeader: component('IonHeader'),
    IonIcon: component('IonIcon'),
    IonInput: formControl('IonInput', 'input'),
    IonItem: component('IonItem'),
    IonLabel: component('IonLabel'),
    IonList: component('IonList'),
    IonNote: component('IonNote'),
    IonSelect: formControl('IonSelect', 'select'),
    IonSelectOption: component('IonSelectOption', '<option><slot/></option>'),
    IonTextarea: formControl('IonTextarea', 'textarea'),
    IonThumbnail: component('IonThumbnail'),
    IonTitle: component('IonTitle'),
    IonToolbar: component('IonToolbar'),
    modalController: { create: createOverlay, dismiss },
  };
});

import InventoryTransferModal from '@/components/InventoryTransferModal.vue';

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await nextTick();
  }
}

describe('InventoryTransferModal', () => {
  beforeEach(() => {
    createOverlay.mockReset();
    dismiss.mockReset();
    createInventoryTransfer.mockReset();
  });

  it('marks the four required fields and replaces internal identifiers with selectors', () => {
    const wrapper = mount(InventoryTransferModal);

    expect(wrapper.text()).toContain('Source facility *');
    expect(wrapper.text()).toContain('Destination facility *');
    expect(wrapper.text()).toContain('Product *');
    expect(wrapper.text()).toContain('Quantity *');
    expect(wrapper.text()).toContain('Sales order item');
    expect(wrapper.text()).not.toContain('Product ID');
    expect(wrapper.text()).not.toContain('Order ID');
    expect(wrapper.text()).not.toContain('Order item sequence ID');
    expect(wrapper.get('[data-testid="select-transfer-product"]').attributes('aria-required')).toBe('true');
    expect(wrapper.findAllComponents({ name: 'IonSelect' }).every((control) => control.props('required'))).toBe(true);
    expect(wrapper.getComponent({ name: 'IonInput' }).props('required')).toBe(true);
  });

  it('uses one modal page and fills the destination from the selected order-item location', async () => {
    const wrapper = mount(InventoryTransferModal);

    await wrapper.get('[data-testid="select-transfer-order-item"]').trigger('click');
    await flush();
    const searchPage = wrapper.getComponent({ name: 'InventoryTransferOrderItemSearchModal' });
    expect(searchPage.props('embedded')).toBe(true);
    expect(createOverlay).not.toHaveBeenCalled();
    searchPage.vm.$emit('select', {
      orderId: '117042',
      orderName: '#7873CAN',
      orderItemSeqId: '02',
      productId: 'VARIANT_1',
      productName: 'Blue dress',
      sku: 'SKU-1',
      facilityId: 'DESTINATION',
      quantity: 2,
    });
    await flush();

    expect(wrapper.text()).toContain('#7873CAN');
    expect(wrapper.text()).toContain('SKU-1');
    expect(wrapper.findAllComponents({ name: 'IonSelect' })[0].props('modelValue')).toBe('');
    expect(wrapper.findAllComponents({ name: 'IonSelect' })[1].props('modelValue')).toBe('DESTINATION');
  });

  it('clears a linked order item when the operator changes to a different product', async () => {
    const wrapper = mount(InventoryTransferModal);

    await wrapper.get('[data-testid="select-transfer-order-item"]').trigger('click');
    await flush();
    wrapper.getComponent({ name: 'InventoryTransferOrderItemSearchModal' }).vm.$emit('select', {
      orderId: '117042', orderName: '#7873CAN', orderItemSeqId: '02',
      productId: 'VARIANT_1', productName: 'Blue dress', sku: 'SKU-1', quantity: 2,
    });
    await flush();
    await wrapper.get('[data-testid="select-transfer-product"]').trigger('click');
    await flush();
    const productPage = wrapper.getComponent({ name: 'InventoryTransferProductSearchModal' });
    expect(productPage.props('embedded')).toBe(true);
    productPage.vm.$emit('select', {
      productId: 'VARIANT_2',
      product: { productId: 'VARIANT_2', productName: 'Green dress', sku: 'SKU-2' },
    });
    await flush();

    expect(wrapper.text()).toContain('SKU-2');
    expect(wrapper.text()).toContain('Select sales order item');
    expect(wrapper.text()).not.toContain('#7873CAN');
  });
});
