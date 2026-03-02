import { ref, watch, computed, Ref } from 'vue';
import { useStore } from 'vuex';
import { translate } from '@hotwax/dxp-components';
import { DateTime } from 'luxon';
import { OrderService } from '@/services/OrderService';
import { hasError } from '@/adapter';
import logger from '@/logger';

export function useOrderTimeline(orderId: Ref<string>) {
  const store = useStore();
  const rawTimeline = ref<any[]>([]);
  const isFetchingTimeline = ref(false);

  // Getter accessors from Vuex
  const currentOrder = computed(() => store.getters['order/getCurrent']);
  const getCarrierDesc = computed(() => store.getters['util/getCarrierDesc']);
  const getShipmentMethodDesc = computed(() => store.getters['util/getShipmentMethodDesc']);
  const getProduct = computed(() => store.getters['product/getProduct']);
  const getStatusDesc = computed(() => store.getters['util/getStatusDesc']);

  const orderTimeline = computed(() => {
    const timeline = JSON.parse(JSON.stringify(rawTimeline.value));

    // Resolve labels and diffs reactively
    const eventsWithLabels = timeline.map((event: any) => {
      if (!event.statusDesc && event.statusId) {
        event.statusDesc = getStatusDesc.value(event.statusId);
      }
      return event;
    });

    // Group item cancellations by timestamp
    const processedTimeline = [] as any[];
    const cancellationsByTime = {} as any;

    eventsWithLabels.forEach((event: any) => {
      if (event.orderItemSeqId && event.statusId === 'ITEM_CANCELLED') {
        const time = event.statusDatetime;
        if (!cancellationsByTime[time]) {
          cancellationsByTime[time] = [];
        }
        cancellationsByTime[time].push(event);
      } else {
        processedTimeline.push(event);
      }
    });

    // Handle grouped cancellations
    Object.keys(cancellationsByTime).forEach((time: any) => {
      const groupedEvents = cancellationsByTime[time];
      const timestamp = Number(time);
      
      if (groupedEvents.length > 1) {
        const items = groupedEvents.map((event: any) => {
          const item = currentOrder.value?.items?.find((i: any) => i.orderItemSeqId === event.orderItemSeqId);
          const product = getProduct.value(item?.productId);
          return {
            ...event,
            productName: product?.productName || item?.productId || event.orderItemSeqId,
            statusUserLogin: event.statusUserLogin
          };
        });

        processedTimeline.push({
          statusDatetime: timestamp,
          statusId: 'GROUPED_CANCELLATIONS',
          statusDesc: `${groupedEvents.length} ${translate('items cancelled')}`,
          items: items,
          eventType: 'CANCELLATION'
        });
      } else {
        const event = groupedEvents[0];
        const item = currentOrder.value?.items?.find((i: any) => i.orderItemSeqId === event.orderItemSeqId);
        const product = getProduct.value(item?.productId);
        const productName = product?.productName || item?.productId || event.orderItemSeqId;

        processedTimeline.push({
          ...event,
          statusDesc: `${translate('Cancelled')}: ${productName}`,
          eventType: 'CANCELLATION',
          items: [{
            ...event,
            productName,
            statusUserLogin: event.statusUserLogin
          }]
        });
      }
    });

    // Sort timeline chronologically
    processedTimeline.sort((a: any, b: any) => (a.statusDatetime || 0) - (b.statusDatetime || 0));

    // Calculate time differences
    if (processedTimeline.length > 0) {
      const baseTime = processedTimeline[0].statusDatetime;
      processedTimeline.forEach((event: any, index: number) => {
        if (event.statusDatetime && index > 0) {
          event['timeDiff'] = findTimeDiff(baseTime, event.statusDatetime);
        }
      });
    }

    return processedTimeline;
  });

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
        },
        entityName: 'OrderStatus',
        viewSize: '100',
        sortBy: 'statusDatetime ASC',
        fieldList: ['statusId', 'statusDatetime', 'orderItemSeqId', 'statusUserLogin'],
      });
      if (!hasError(resp)) {
        timeline = resp.data.docs || [];
        
        // Filter: include all order-level statuses (no orderItemSeqId) 
        // AND item-level statuses only if they are cancelled
        timeline = timeline.filter((status: any) => !status.orderItemSeqId || status.statusId === 'ITEM_CANCELLED');

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
      } else {
        throw resp.data;
      }
    } catch (error: any) {
      logger.error('Failed to fetch order timeline', error);
    } finally {
      rawTimeline.value = timeline;
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
        rawTimeline.value = [];
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
