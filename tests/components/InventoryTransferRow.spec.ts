import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { closeCircleOutline } from 'ionicons/icons';

vi.mock('@common', () => ({
  translate: (label: string) => label,
}));

vi.mock('@ionic/vue', () => {
  const component = (name: string, template = '<div><slot name="start"/><slot/><slot name="end"/></div>') =>
    defineComponent({ name, inheritAttrs: false, template });
  return {
    IonBadge: component('IonBadge'),
    IonButton: defineComponent({ name: 'IonButton', template: '<button><slot/></button>' }),
    IonButtons: component('IonButtons'),
    IonCheckbox: component('IonCheckbox', '<input type="checkbox"/>'),
    IonChip: component('IonChip'),
    IonIcon: defineComponent({ name: 'IonIcon', props: ['icon'], template: '<span><slot/></span>' }),
    IonItem: component('IonItem'),
    IonLabel: component('IonLabel'),
    IonNote: component('IonNote'),
    IonThumbnail: component('IonThumbnail'),
  };
});

vi.mock('@/components/Image.vue', () => ({
  default: defineComponent({ name: 'ProductImage', props: ['src'], template: '<img :src="src" />' }),
}));

import InventoryTransferRow from '@/components/InventoryTransferRow.vue';

const transfer = {
  inventoryTransferId: '100000',
  productId: '144349',
  quantity: 3,
  orderId: '117042',
  orderItemSeqId: '02',
  statusId: 'IXF_REQUESTED',
};

describe('InventoryTransferRow', () => {
  it('presents the transfer around the primary product identifier without exposing internal references', () => {
    const wrapper = mount(InventoryTransferRow, {
      props: {
        transfer,
        imageUrl: 'https://cdn.example/product.jpg',
        primaryIdentifier: 'MH09-XS-BLUE',
        secondaryIdentifier: '203-321-244244',
        sourceFacilityName: '2301 E. 51st St.',
        destinationFacilityName: 'CAN WH - Ponyride',
        orderName: '#7873CAN',
        createdTime: '05 Sep 2026 4:37 AM',
        statusLabel: 'Requested',
        statusColor: 'warning',
        canManage: true,
        selectMode: false,
        selected: false,
      },
    });

    expect(wrapper.text()).toContain('Transfer 100000');
    expect(wrapper.text()).toContain('MH09-XS-BLUE');
    expect(wrapper.text()).not.toContain('203-321-244244');
    expect(wrapper.text()).not.toContain('144349');
    expect(wrapper.text()).toContain('2301 E. 51st St.');
    expect(wrapper.text()).toContain('CAN WH - Ponyride');
    expect(wrapper.text()).toContain('#7873CAN');
    expect(wrapper.text()).not.toContain('117042');
    expect(wrapper.text()).not.toContain('Item 02');
    expect(wrapper.getComponent({ name: 'IonItem' }).text()).toContain('05 Sep 2026 4:37 AM');
    expect(wrapper.text().match(/05 Sep 2026 4:37 AM/g)).toHaveLength(1);
    expect(wrapper.text()).toContain('3');
    expect(wrapper.find('img').attributes('src')).toBe('https://cdn.example/product.jpg');
  });

  it('uses row selection in bulk mode and hides destructive row actions', async () => {
    const wrapper = mount(InventoryTransferRow, {
      props: {
        transfer,
        imageUrl: '',
        primaryIdentifier: 'MH09-XS-BLUE',
        sourceFacilityName: 'Source',
        destinationFacilityName: 'Destination',
        orderName: '#7873CAN',
        createdTime: '05 Sep 2026 4:37 AM',
        statusLabel: 'Requested',
        statusColor: 'warning',
        canManage: true,
        selectMode: true,
        selected: false,
      },
    });

    wrapper.getComponent({ name: 'IonCheckbox' }).vm.$emit('ionChange', { detail: { checked: true } });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('selection-change')).toEqual([[true]]);
    expect(wrapper.text()).not.toContain('Execute');
    expect(wrapper.text()).not.toContain('Cancel');
  });

  it('hides the redundant requested status while keeping terminal statuses visible', () => {
    const props = {
      transfer,
      imageUrl: '',
      primaryIdentifier: 'MH09-XS-BLUE',
      sourceFacilityName: 'Source',
      destinationFacilityName: 'Destination',
      orderName: '#7873CAN',
      createdTime: '05 Sep 2026 4:37 AM',
      statusLabel: 'Requested',
      statusColor: 'warning',
      canManage: true,
      selectMode: false,
      selected: false,
    };
    const requestedRow = mount(InventoryTransferRow, { props });
    const cancelledRow = mount(InventoryTransferRow, {
      props: {
        ...props,
        transfer: { ...transfer, statusId: 'IXF_CANCELLED' },
        statusLabel: 'Cancelled',
        statusColor: 'danger',
      },
    });

    expect(requestedRow.findComponent({ name: 'IonBadge' }).exists()).toBe(false);
    expect(cancelledRow.getComponent({ name: 'IonBadge' }).text()).toBe('Cancelled');
  });

  it('uses an accessible close-circle icon for the row cancel action', () => {
    const wrapper = mount(InventoryTransferRow, {
      props: {
        transfer,
        imageUrl: '',
        primaryIdentifier: 'MH09-XS-BLUE',
        sourceFacilityName: 'Source',
        destinationFacilityName: 'Destination',
        orderName: '#7873CAN',
        createdTime: '05 Sep 2026 4:37 AM',
        statusLabel: 'Requested',
        statusColor: 'warning',
        canManage: true,
        selectMode: false,
        selected: false,
      },
    });
    const actionButtons = wrapper.getComponent({ name: 'IonButtons' }).findAllComponents({ name: 'IonButton' });
    const cancelButton = actionButtons[1];
    const cancelIcon = cancelButton.getComponent({ name: 'IonIcon' });

    expect(cancelButton.text()).toBe('');
    expect(cancelButton.attributes('aria-label')).toBe('Cancel inventory transfer');
    expect(cancelIcon.attributes('slot')).toBe('icon-only');
    expect(cancelIcon.props('icon')).toBe(closeCircleOutline);
  });
});
