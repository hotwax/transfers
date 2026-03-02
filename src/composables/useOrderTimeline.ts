import { ref, watch, computed, Ref } from 'vue';
import { useStore } from 'vuex';
import { translate } from '@hotwax/dxp-components';
import { DateTime } from 'luxon';
import { OrderService } from '@/services/OrderService';
import { hasError } from '@/adapter';
import logger from '@/logger';

export function useOrderTimeline(orderId: Ref<string>) {
  const store = useStore();
  const orderTimeline = ref<any[]>([]);
  const isFetchingTimeline = ref(false);

  // Getter accessors from Vuex
  const currentOrder = computed(() => store.getters['order/getCurrent']);
  const getCarrierDesc = computed(() => store.getters['util/getCarrierDesc']);
  const getShipmentMethodDesc = computed(() => store.getters['util/getShipmentMethodDesc']);

  function findTimeDiff(startTime: any, endTime: any): string {
    if (!endTime || !startTime) {
      return '';
    }

    const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), [
      'years',
      'months',
      'days',
      'hours',
      'minutes',
    ]);
    let diffString = '+ ';
    if (timeDiff.years) diffString += `${Math.round(timeDiff.years)} years `;
    if (timeDiff.months) diffString += `${Math.round(timeDiff.months)} months `;
    if (timeDiff.days) diffString += `${Math.round(timeDiff.days)} days `;
    if (timeDiff.hours) diffString += `${Math.round(timeDiff.hours)} hours `;
    if (timeDiff.minutes) diffString += `${Math.round(timeDiff.minutes)} minutes `;

    return diffString.trim() !== '+' ? diffString.trim().toUpperCase() : '';
  }

  async function fetchOrderTimeline() {
    if (!orderId.value) return;
    
    isFetchingTimeline.value = true;
    let timeline = [] as any[];
    try {
      const resp = await OrderService.fetchOrderStatusHistory({
        inputFields: {
          orderId: orderId.value,
          orderItemSeqId_op: 'empty',
        },
        entityName: 'OrderStatus',
        viewSize: '100',
        sortBy: 'statusDatetime ASC',
        fieldList: ['statusId', 'statusDatetime'],
      });
      if (!hasError(resp)) {
        timeline = resp.data.docs || [];

        // Add shipments to timeline
        const shipments = currentOrder.value?.shipments || [];
        shipments.forEach((shipment: any) => {
          timeline.push({
            ...shipment,
            statusDatetime: Number(shipment.statusDate),
            eventType: 'SHIPMENT',
            statusDesc: translate('Shipped'), // explicitly set description
            carrierDesc: getCarrierDesc.value(shipment.routeSegCarrierPartyId),
            shipmentMethodDesc: getShipmentMethodDesc.value(shipment.routeSegShipmentMethodTypeId),
          });
        });

        // Add receipts to timeline
        const receipts = currentOrder.value?.receipts || {};
        Object.keys(receipts).forEach((datetimeReceived: any) => {
          timeline.push({
            statusDatetime: Number(datetimeReceived),
            eventType: 'RECEIPT',
            statusDesc: translate('Receipt'), // explicitly set description
          });
        });

        // Sort timeline chronologically
        timeline.sort((a: any, b: any) => (a.statusDatetime || 0) - (b.statusDatetime || 0));

        if (timeline.length > 0) {
          const baseTime = timeline[0].statusDatetime;
          timeline.forEach((event: any) => {
            if (event.statusDatetime && event !== timeline[0]) {
              event['timeDiff'] = findTimeDiff(baseTime, event.statusDatetime);
            }
          });
        }
      } else {
        throw resp.data;
      }
    } catch (error: any) {
      logger.error('Failed to fetch order timeline', error);
    } finally {
      orderTimeline.value = timeline;
      isFetchingTimeline.value = false;
    }
  }

  // Refetch when orderId changes
  watch(
    () => orderId.value,
    (newVal) => {
      if (newVal) {
        fetchOrderTimeline();
      } else {
        orderTimeline.value = [];
      }
    },
    { immediate: true }
  );

  return {
    orderTimeline,
    isFetchingTimeline,
    fetchOrderTimeline,
  };
}
