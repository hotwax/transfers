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
    
    // Add shipments to timeline reactively
    const shipments = currentOrder.value?.shipments || [];
    shipments.forEach((shipment: any) => {
      timeline.push({
        ...shipment,
        statusDatetime: Number(shipment.statusDate),
        eventType: 'SHIPMENT',
        statusDesc: translate('Shipped'),
        carrierDesc: getCarrierDesc.value(shipment.routeSegCarrierPartyId),
        shipmentMethodDesc: getShipmentMethodDesc.value(shipment.routeSegShipmentMethodTypeId),
      });
    });

    // Add receipts to timeline reactively
    const receipts = currentOrder.value?.receipts || {};
    Object.keys(receipts).forEach((datetimeReceived: any) => {
      const respReceipts = receipts[datetimeReceived];
      timeline.push({
        statusDatetime: Number(datetimeReceived),
        eventType: 'RECEIPT',
        statusDesc: translate('Receipt'),
        items: respReceipts,
        receivedByUserLoginId: respReceipts[0]?.receivedByUserLoginId
      });
    });

    // Resolve labels and diffs reactively
    const eventsWithLabels = timeline.map((event: any) => {
      if (!event.statusDesc && event.statusId) {
        event.statusDesc = getStatusDesc.value(event.statusId);
      }
      return event;
    });

    // Group item cancellations by timestamp window (within 1 minute)
    const processedTimeline = [] as any[];
    const groupedCancellations = [] as any[];

    eventsWithLabels.forEach((event: any) => {
      if (event.orderItemSeqId && event.statusId === 'ITEM_CANCELLED') {
        const time = event.statusDatetime;
        let groupFound = false;
        
        for (const group of groupedCancellations) {
          const firstEventTime = group[0].statusDatetime;
          // Group if within 1 minute (60000ms)
          if (Math.abs(time - firstEventTime) <= 60000) {
            group.push(event);
            groupFound = true;
            break;
          }
        }
        
        if (!groupFound) {
          groupedCancellations.push([event]);
        }
      } else {
        processedTimeline.push(event);
      }
    });

    // Handle grouped cancellations
    groupedCancellations.forEach((groupedEvents: any[]) => {
      const timestamp = groupedEvents[0].statusDatetime;
      
      if (groupedEvents.length > 1) {
        const items = groupedEvents.map((event: any) => {
          const item = currentOrder.value?.items?.find((i: any) => i.orderItemSeqId === event.orderItemSeqId);
          const product = getProduct.value(item?.productId);
          return {
            ...event,
            productId: item?.productId,
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
            productId: item?.productId,
            productName,
            statusUserLogin: event.statusUserLogin
          }]
        });
      }
    });

    // Sort timeline chronologically
    processedTimeline.sort((a: any, b: any) => (a.statusDatetime || 0) - (b.statusDatetime || 0));

    // Calculate time differences relative to previous event
    if (processedTimeline.length > 1) {
      processedTimeline.forEach((event: any, index: number) => {
        if (event.statusDatetime && index > 0) {
          const prevEvent = processedTimeline[index - 1];
          if (prevEvent.statusDatetime) {
            event['timeDiff'] = findTimeDiff(prevEvent.statusDatetime, event.statusDatetime);
          }
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
        viewSize: '250',
        sortBy: 'statusDatetime ASC',
        fieldList: ['statusId', 'statusDatetime', 'orderItemSeqId', 'statusUserLogin'],
      });
      if (!hasError(resp)) {
        timeline = resp.data.docs || [];
        
        // Filter: include all order-level statuses (no orderItemSeqId) 
        // AND item-level statuses only if they are cancelled
        timeline = timeline.filter((status: any) => !status.orderItemSeqId || status.statusId === 'ITEM_CANCELLED');
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
