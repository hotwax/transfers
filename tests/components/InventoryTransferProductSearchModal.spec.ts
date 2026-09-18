import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';

const dismiss = vi.hoisted(() => vi.fn());
const searchStyles = vi.hoisted(() => vi.fn());
const fetchVariants = vi.hoisted(() => vi.fn());

vi.mock('@common', () => ({ translate: (label: string) => label }));
vi.mock('@/composables/useInventoryTransferProductSearch', () => ({
  useInventoryTransferProductSearch: () => ({ searchStyles, fetchVariants }),
}));
vi.mock('@/components/Image.vue', () => ({
  default: defineComponent({ name: 'ProductImage', props: ['src'], template: '<img :src="src" />' }),
}));
vi.mock('@ionic/vue', () => {
  const component = (name: string, template = '<div><slot name="start"/><slot/><slot name="end"/></div>') =>
    defineComponent({ name, template });
  return {
    IonButton: component('IonButton', '<button><slot/></button>'),
    IonButtons: component('IonButtons'),
    IonContent: component('IonContent'),
    IonFooter: component('IonFooter'),
    IonHeader: component('IonHeader'),
    IonIcon: component('IonIcon'),
    IonItem: component('IonItem'),
    IonLabel: component('IonLabel'),
    IonList: component('IonList'),
    IonRadio: component('IonRadio', '<input type="radio"/>'),
    IonRadioGroup: component('IonRadioGroup'),
    IonSearchbar: component('IonSearchbar', '<input/>'),
    IonSpinner: component('IonSpinner'),
    IonThumbnail: component('IonThumbnail'),
    IonTitle: component('IonTitle'),
    IonToolbar: component('IonToolbar'),
    modalController: { dismiss },
  };
});

import InventoryTransferProductSearchModal from '@/components/InventoryTransferProductSearchModal.vue';

const STYLE = { productId: 'STYLE_1', productName: 'A style', mainImageUrl: 'style.jpg' };
const VARIANTS = [
  { productId: 'VARIANT_1', productName: 'Blue / Small', sku: 'SKU-1' },
  { productId: 'VARIANT_2', productName: 'Green / Small', sku: 'SKU-2' },
];

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await nextTick();
  }
}

describe('InventoryTransferProductSearchModal', () => {
  it('drills from styles into variants and returns exactly one selected product', async () => {
    dismiss.mockReset();
    searchStyles.mockResolvedValue({ styles: [STYLE], total: 1 });
    fetchVariants.mockResolvedValue({ variants: VARIANTS, total: 2 });
    const wrapper = mount(InventoryTransferProductSearchModal);
    await flush();

    await wrapper.getComponent({ name: 'IonItem' }).trigger('click');
    await flush();
    expect(fetchVariants).toHaveBeenCalledWith('STYLE_1');

    const rows = wrapper.findAllComponents({ name: 'IonItem' });
    await rows[1].trigger('click');
    await wrapper.get('[data-testid="apply-product-filter"]').trigger('click');

    expect(dismiss).toHaveBeenCalledWith({ productId: 'VARIANT_1', product: VARIANTS[0] }, 'confirm');
  });

  it('clears an existing product filter explicitly', async () => {
    dismiss.mockReset();
    searchStyles.mockResolvedValue({ styles: [STYLE], total: 1 });
    const wrapper = mount(InventoryTransferProductSearchModal, { props: { selectedProductId: 'VARIANT_1' } });
    await flush();

    const clear = wrapper.findAllComponents({ name: 'IonButton' }).find((button) => button.text().includes('Clear filter'))!;
    await clear.trigger('click');

    expect(dismiss).toHaveBeenCalledWith({ productId: '' }, 'confirm');
  });

  it('uses selection language and does not offer filter clearing during transfer creation', async () => {
    dismiss.mockReset();
    searchStyles.mockResolvedValue({ styles: [STYLE], total: 1 });
    fetchVariants.mockResolvedValue({ variants: VARIANTS, total: 2 });
    const wrapper = mount(InventoryTransferProductSearchModal, { props: { selectionMode: true } });
    await flush();

    await wrapper.getComponent({ name: 'IonItem' }).trigger('click');
    await flush();
    await wrapper.findAllComponents({ name: 'IonItem' })[1].trigger('click');

    expect(wrapper.text()).not.toContain('Clear filter');
    expect(wrapper.get('[data-testid="apply-product-filter"]').text()).toBe('Select');
  });

  it('returns selections and back navigation to an embedded parent without dismissing a modal', async () => {
    dismiss.mockReset();
    searchStyles.mockResolvedValue({ styles: [STYLE], total: 1 });
    fetchVariants.mockResolvedValue({ variants: VARIANTS, total: 2 });
    const wrapper = mount(InventoryTransferProductSearchModal, {
      props: { embedded: true, selectionMode: true },
    });
    await flush();

    await wrapper.getComponent({ name: 'IonItem' }).trigger('click');
    await flush();
    await wrapper.findAllComponents({ name: 'IonItem' })[1].trigger('click');
    await wrapper.get('[data-testid="apply-product-filter"]').trigger('click');

    expect(wrapper.emitted('select')?.[0]).toEqual([{ productId: 'VARIANT_1', product: VARIANTS[0] }]);
    expect(dismiss).not.toHaveBeenCalled();
  });
});
