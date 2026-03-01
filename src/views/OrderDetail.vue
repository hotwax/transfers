<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/transfers" />
        <ion-title>{{ translate("Transfer order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main v-if="isFetchingOrderDetail">
        <div class="empty-state">
          <ion-spinner name="crescent" />
          <ion-label>{{ translate("Fetching order details") }}</ion-label>
        </div>
      </main>
      <main v-else>
        <section class="header">
          <div class="id ion-margin-top">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="ticketOutline" />
              <ion-label>
                <p class="overline">{{ getStatusDesc(currentOrder.statusId) }}</p>
                <h1>{{ currentOrder.orderName ? currentOrder.orderName : currentOrder.orderId }}</h1>
              </ion-label>
              <div slot="end">
                <ion-button v-for="action in OrderActionValidator.getHeaderActions(currentOrder)" :key="action.id" fill="outline" :color="action.color || 'primary'" size="small" :disabled="isOrderStatusUpdateDisabled || !action.validation.allowed" @click="handleHeaderAction(action)">
                  {{ translate(action.label) }}
                </ion-button>
              </div>
            </ion-item>
          </div>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ currentOrder.originFacility?.facilityName ? currentOrder.originFacility.facilityName : getFacilityName(currentOrder.facilityId) }}</ion-card-title>
              </ion-card-header>
              <ion-item v-if="currentOrder?.originFacility" lines="none">
                <ion-icon :icon="sendOutline" slot="start" />
                <ion-label>
                  <h3 v-if="currentOrder.originFacility?.address1">{{ currentOrder.originFacility.address1 }}</h3>
                  <h3 v-if="currentOrder.originFacility?.address2">{{ currentOrder.originFacility.address2 }}</h3>
                  <p>{{ currentOrder.originFacility?.city ?? "" }}{{ (currentOrder.originFacility?.city && currentOrder.originFacility?.postalCode) && ", " }}{{ currentOrder.originFacility?.postalCode ?? "" }}</p>
                  <p>{{ currentOrder.originFacility?.stateGeoName ?? "" }}{{ (currentOrder.originFacility?.stateGeoName && currentOrder.originFacility?.countryGeoName) && ", " }}{{ currentOrder.originFacility?.countryGeoName ?? "" }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-select :label="translate('Carrier')" :value="currentOrder.carrierPartyId" interface="popover" :placeholder="translate('Select')" :disabled="isOrderFinished()" @ionChange="updateCarrierAndShipmentMethod($event, $event.detail.value, '')">
                  <ion-select-option :value="carrierPartyId" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index">{{ getCarrierDesc(carrierPartyId) ? getCarrierDesc(carrierPartyId) : carrierPartyId }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item lines="none">
                <ion-select :label="translate('Method')" :value="currentOrder.shipmentMethodTypeId" v-if="carrierMethods?.length" :placeholder="translate('Select')" interface="popover" :disabled="isOrderFinished()" @ionChange="updateCarrierAndShipmentMethod($event, currentOrder.carrierPartyId, $event.detail.value)">
                  <ion-select-option :value="shipmentMethod.shipmentMethodTypeId" v-for="(shipmentMethod, index) in carrierMethods" :key="index">{{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}</ion-select-option>
                </ion-select>
                <template v-else>
                  <ion-icon :icon="informationCircleOutline" slot="start" />
                  <ion-label>{{ "No shipment methods found" }}</ion-label>
                </template>
              </ion-item>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ currentOrder.destinationFacility?.facilityName ? currentOrder.destinationFacility.facilityName : getFacilityName(currentOrder.orderFacilityId) }}</ion-card-title>
              </ion-card-header>
              <ion-item v-if="currentOrder?.destinationFacility" lines="none">
                <ion-icon :icon="downloadOutline" slot="start" />
                <ion-label>
                  <h3 v-if="currentOrder.destinationFacility?.address1">{{ currentOrder.destinationFacility.address1 }}</h3>
                  <h3 v-if="currentOrder.destinationFacility?.address2">{{ currentOrder.destinationFacility.address2 }}</h3>
                  <p>{{ currentOrder.destinationFacility?.city ?? "" }}{{ (currentOrder.destinationFacility?.city && currentOrder.destinationFacility?.postalCode) && ", " }}{{ currentOrder.destinationFacility?.postalCode ?? "" }}</p>
                  <p>{{ currentOrder.destinationFacility?.stateGeoName ?? "" }}{{ (currentOrder.destinationFacility?.stateGeoName && currentOrder.destinationFacility?.countryGeoName) && ", " }}{{ currentOrder.destinationFacility?.countryGeoName ?? "" }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </div>

          <div class="timeline" v-if="orderTimeline?.length">
            <ion-list class="desktop-only">
              <ion-item lines="none">
                <h2>{{ translate("Timeline") }}</h2>
              </ion-item>
              <ion-item v-for="(event, index) in orderTimeline" :key="index" :button="!!event.eventType" @click="viewEventDetails(event)">
                <ion-icon 
                  slot="start" 
                  :icon="event.eventType === 'SHIPMENT' ? sendOutline : (event.eventType === 'RECEIPT' ? downloadOutline : ticketOutline)" 
                  :color="event.eventType ? 'primary' : 'medium'"
                />
                <ion-label>
                  <p class="overline" v-if="event.timeDiff">{{ event.timeDiff }}</p>
                  {{ event.statusDesc || (event.statusId ? getStatusDesc(event.statusId) : '') }}
                </ion-label>
                <ion-note slot="end">{{ event.statusDatetime ? formatDateTime(event.statusDatetime) : '-' }}</ion-note>
              </ion-item>
            </ion-list>
          </div>
        </section>

        <section class="summary" v-if="currentOrder.originFacility || currentOrder.destinationFacility">
          <ion-item lines="none">
            <ion-label>
              <h1>{{ translate("Summary") }}</h1>
              <p>{{ statusFlowDesc }}</p>
            </ion-label>
          </ion-item>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Status") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-chip :outline="selectedStatusFilter !== filter.value" v-for="filter in availableStatusFilters" :key="filter.value" @click="handleStatusFilterChange(filter.value)">
                  <ion-label>{{ translate(filter.label) }} ({{ statusCounts[filter.value] || 0 }})</ion-label>
                </ion-chip>
              </ion-card-content>
            </ion-card>

            <ion-card v-if="discrepancySummary.total">
              <ion-card-header>
                <ion-card-title>{{ translate("Discrepancies") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'ALL'" @click="handleDiscrepancyFilterChange('ALL')">
                  <ion-label>{{ translate("All") }} ({{ discrepancySummary.total }})</ion-label>
                </ion-chip>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'UNDER_SHIPPED'" v-if="discrepancySummary.underShipped" @click="handleDiscrepancyFilterChange('UNDER_SHIPPED')">
                  <ion-label>{{ translate("Under shipped") }} ({{ discrepancySummary.underShipped }})</ion-label>
                </ion-chip>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'UNDER_RECEIVED'" v-if="discrepancySummary.underReceived" @click="handleDiscrepancyFilterChange('UNDER_RECEIVED')">
                  <ion-label>{{ translate("Under received") }} ({{ discrepancySummary.underReceived }})</ion-label>
                </ion-chip>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'OVER_RECEIVED'" v-if="discrepancySummary.overReceived" @click="handleDiscrepancyFilterChange('OVER_RECEIVED')">
                  <ion-label>{{ translate("Over received") }} ({{ discrepancySummary.overReceived }})</ion-label>
                </ion-chip>
              </ion-card-content>
            </ion-card>
          </div>
        </section>

        <section class="ion-margin-top">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="shirtOutline" />
            <ion-label>
              <h1>{{ translate("Items") }}</h1>
            </ion-label>
            <ion-button size="default" fill="outline" color="medium" :disabled="!OrderActionValidator.canAddItems(currentOrder).allowed" @click="addProduct()">
              {{ translate("Add item to transfer") }}
            </ion-button>
          </ion-item>

          <hr />

          <template v-for="([parentProductId, items], index) in (Object.entries(itemsByParentProductId) as any)" :key="index">
            <template v-if="(items as any).length">
              <!-- Show parent product header only if there is more than one item -->
              <div v-if="(items as any).length > 1" class="list-item product-header">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <Image :src="getProduct(items[0].productId)?.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    {{ parentProductInfoById[parentProductId]?.parentProductName }}
                    <p class="overline">{{ parentProductId }}</p>
                  </ion-label>
                </ion-item>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ parentProductInfoById[parentProductId]?.totalOrdered || 0 }}
                    <p>{{ translate("ordered") }}</p>
                  </ion-label>
                </div>
                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ parentProductInfoById[parentProductId]?.totalShipped || 0 }}
                    <p>{{ translate("shipped") }}</p>
                  </ion-label>
                </div>
                <div class="ion-text-center ion-padding-end">
                  <ion-label>
                    {{ parentProductInfoById[parentProductId]?.totalReceived || 0 }}
                    <p>{{ translate("received") }}</p>
                  </ion-label>
                </div>
                <div class="ion-text-center ion-padding-end">
                  <ion-label>
                    {{ formatCurrency(parentProductInfoById[parentProductId]?.totalPrice, currentOrder.currencyUom) || "0.00" }}
                  </ion-label>
                </div>
              </div>

              <div class="list-item" v-for="(item, itemIndex) in (items as any)" :key="itemIndex">
                <ion-item lines="none">
                  <ion-thumbnail slot="start" v-if="(items as any).length === 1">
                    <Image :src="getProduct(item.productId)?.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    <template v-if="(items as any).length === 1">
                      <p class="overline">{{ parentProductInfoById[parentProductId]?.parentProductName }}</p>
                    </template>
                    {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                    <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  </ion-label>
                </ion-item>

                <div class="tablet ion-text-center">
                  <ion-label>
                    {{ item.quantity || 0 }}
                    <p>{{ translate("ordered") }}</p>
                  </ion-label>
                </div>
                <div class="tablet ion-text-center">
                  <ion-chip outline>
                    <ion-icon :icon="sendOutline" />
                    <ion-label>{{ item.shippedQty || 0 }}</ion-label>
                  </ion-chip>
                </div>
                <div class="tablet ion-text-center">
                  <ion-chip outline>
                    <ion-icon :icon="downloadOutline" />
                    <ion-label>{{ item.receivedQty || 0 }}</ion-label>
                  </ion-chip>
                </div>
                <div> 
                  <ion-badge :color="(STATUSCOLOR as any)[item.statusId] || 'medium'">{{ getStatusDesc(item.statusId) }}</ion-badge>
                  <ion-badge color="warning" v-if="isUnderShipped(item)" :title="translate('Under shipped')">{{ translate("Under shipped") }}</ion-badge>
                  <ion-badge color="danger" v-if="isUnderReceived(item)" :title="translate('Under received')">{{ translate("Under received") }}</ion-badge>
                  <ion-badge color="primary" v-if="isOverReceived(item)" :title="translate('Over received')">{{ translate("Over received") }}</ion-badge>
                </div>
                <ion-button fill="clear" color="medium" :disabled="!OrderActionValidator.getItemActions(currentOrder, item).length" @click="openOrderItemDetailActionsPopover($event, item)">
                  <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
                </ion-button>
              </div>
            </template>
            <hr />
          </template>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton,IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter, alertController, modalController, popoverController } from "@ionic/vue";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { ellipsisVerticalOutline, ticketOutline, downloadOutline, sendOutline, shirtOutline, informationCircleOutline, closeCircleOutline } from "ionicons/icons";
import Image from "@/components/Image.vue";
import OrderItemDetailActionsPopover from '@/components/OrderItemDetailActionsPopover.vue';
import ShipmentDetailModal from '@/components/ShipmentDetailModal.vue';
import AddProductModal from "@/components/AddProductModal.vue"
import { useOrderQueue } from '@/composables/useProductQueue';
import { computed, ref } from "vue";
import { useStore } from "vuex";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { hasError, STATUSCOLOR } from "@/adapter";
import { DateTime } from "luxon";
import { showToast } from "@/utils";
import emitter from "@/event-bus";
import { formatCurrency } from "@/utils";
import { OrderActionValidator, OrderHeaderAction } from "@/utils/OrderActionValidator";

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();
const orderQueue = useOrderQueue();
const props = defineProps(["orderId"]);

const currentOrder = computed(() => store.getters["order/getCurrent"])
const getStatusDesc = computed(() => store.getters["util/getStatusDesc"])
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getProduct = computed(() => store.getters["product/getProduct"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])
const getShipmentMethodDesc = computed(() => store.getters["util/getShipmentMethodDesc"])
const facilities = computed(() => store.getters["util/getFacilitiesByProductStore"])
// disable order status updates during product processing
const isOrderStatusUpdateDisabled = computed(() => {
  return isUpdatingOrderStatus.value || orderQueue.pendingProductIds.value.size > 0;
});

const isFetchingOrderDetail = ref(false);

const itemsByParentProductId = ref({}) as any;
const parentProductInfoById = ref({}) as any;
const orderTimeline = ref([]) as any;
const carrierMethods = ref([]) as any;
const isUpdatingOrderStatus = ref(false);
const selectedStatusFilter = ref("ALL");
const selectedDiscrepancyFilter = ref("ALL");

const isExcluded = (item: any) => currentOrder.value?.statusId === "ORDER_CANCELLED" || item.statusId === "ITEM_CANCELLED";
const isReceiptFinished = (item: any) => item.statusId === "ITEM_COMPLETED";

const isUnderShipped = (item: any) => !isExcluded(item) && item.cancelQuantity > 0;
const isUnderReceived = (item: any) => !isExcluded(item) && isReceiptFinished(item) && (item.receivedQty || 0) < (item.shippedQty || 0);
const isOverReceived = (item: any) => !isExcluded(item) && (item.receivedQty || 0) > (item.shippedQty || 0);

const availableStatusFilters = computed(() => {
  const flow = currentOrder.value?.statusFlowId;
  const filters = [{ label: "All", value: "ALL" }];
  if (flow === "TO_Fulfill_Only" || flow === "TO_Fulfill_And_Receive") {
    filters.push({ label: "Pending fulfillment", value: "PENDING_FULFILLMENT" });
  }
  if (flow === "TO_Receive_Only" || flow === "TO_Fulfill_And_Receive") {
    filters.push({ label: "Pending receipt", value: "PENDING_RECEIPT" });
  }
  filters.push({ label: "Completed", value: "COMPLETED" });
  return filters;
});

const statusCounts = computed(() => {
  const counts = { ALL: 0 } as any;
  currentOrder.value.items?.forEach((item: any) => {
    counts.ALL++;
    const status = item.statusId;
    if (["ITEM_CREATED", "ITEM_PENDING_FULFILL"].includes(status)) {
      counts.PENDING_FULFILLMENT = (counts.PENDING_FULFILLMENT || 0) + 1;
    } else if (["ITEM_APPROVED", "ITEM_PENDING_RECEIPT"].includes(status)) {
      counts.PENDING_RECEIPT = (counts.PENDING_RECEIPT || 0) + 1;
    } else if (status === "ITEM_COMPLETED") {
      counts.COMPLETED = (counts.COMPLETED || 0) + 1;
    }
  });
  return counts;
});

const discrepancySummary = computed(() => {
  const summary = { total: 0, underShipped: 0, underReceived: 0, overReceived: 0 };
  currentOrder.value.items?.forEach((item: any) => {
    let hasDiscrepancy = false;
    if (isUnderShipped(item)) {
      summary.underShipped++;
      hasDiscrepancy = true;
    }
    if (isUnderReceived(item)) {
      summary.underReceived++;
      hasDiscrepancy = true;
    }
    if (isOverReceived(item)) {
      summary.overReceived++;
      hasDiscrepancy = true;
    }
    if (hasDiscrepancy) summary.total++;
  });
  return summary;
});

const statusFlowDesc = computed(() => {
  const flow = currentOrder.value?.statusFlowId;
  switch (flow) {
    case "TO_Fulfill_And_Receive":
      return translate("This transfer order is for fulfill and receive.");
    case "TO_Fulfill_Only":
      return translate("This transfer order is for fulfill only.");
    case "TO_Receive_Only":
      return translate("This transfer order is for receiving only.");
    default:
      return "";
  }
})

function handleStatusFilterChange(value: string) {
  selectedStatusFilter.value = value;
  selectedDiscrepancyFilter.value = "ALL";
  generateItemsListByParent();
}

function handleDiscrepancyFilterChange(value: string) {
  selectedDiscrepancyFilter.value = value;
  selectedStatusFilter.value = "ALL";
  generateItemsListByParent();
}

onIonViewWillEnter(async () => {
  isFetchingOrderDetail.value = true;
  await store.dispatch("order/fetchOrderDetails", props.orderId)
  await Promise.allSettled([store.dispatch('util/fetchStatusDesc'), store.dispatch("util/fetchCarriersDetail"), fetchOrderTimeline(), store.dispatch("util/fetchShipmentMethodTypeDesc")])
  generateItemsListByParent();
  isFetchingOrderDetail.value = false;
  carrierMethods.value = shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
})

function handleHeaderAction(action: OrderHeaderAction) {
  if (action.handler === 'changeOrderStatus') {
    changeOrderStatus(action.statusId);
  } else {
    updateOrderStatus(action.statusId);
  }
}

async function changeOrderStatus(updatedStatusId: string) {
  if(updatedStatusId === "ORDER_APPROVED") {
    updateOrderStatus(updatedStatusId);
    return;
  }

  const alert = await alertController.create({
    header: translate("Cancel Transfer Order"),
    message: translate("Cancelation cannot be reverted. Are you sure you want to cancel this transfer order?"),
    buttons: [{
      text: translate("Dismiss"),
      role: "cancel"
    }, {
      text: translate("Cancel"),
      handler: () => {
        updateOrderStatus(updatedStatusId);
      }
    }]
  })
  alert.present()

}

async function updateOrderStatus(updatedStatusId: string) {
  isUpdatingOrderStatus.value = true;
  let resp;
  try {
    if (updatedStatusId === "ORDER_APPROVED") {
      if (currentOrder.value.statusFlowId === "TO_Receive_Only") {
        resp = await OrderService.approveWarehouseFulfillOrder({ orderId: currentOrder.value.orderId })
      } else {
        resp = await OrderService.approveOrder({ orderId: currentOrder.value.orderId })
      }
    }
    if (updatedStatusId === "ORDER_CANCELLED") {
      resp = await OrderService.cancelOrder({ orderId: currentOrder.value.orderId })
    }

    if (!hasError(resp)) {
      showToast(translate("Order status updated successfully."))
      await Promise.all([
        store.dispatch("order/fetchOrderDetails", props.orderId),
        fetchOrderTimeline()
      ]);
      generateItemsListByParent();
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error)
    // Show the actual error message from API response
    const errorMessage = error?.response?.data?.errors || translate("Failed to update order status.");
    showToast(errorMessage)
  } finally {
    isUpdatingOrderStatus.value = false;
  }
}

function generateItemsListByParent() {
  const itemsById = {} as any;
  const itemsList = currentOrder.value.items || [];

  const filteredItems = itemsList.filter((item: any) => {
    if (selectedStatusFilter.value !== "ALL") {
      if (selectedStatusFilter.value === "PENDING_FULFILLMENT") return ["ITEM_CREATED", "ITEM_PENDING_FULFILL"].includes(item.statusId);
      if (selectedStatusFilter.value === "PENDING_RECEIPT") return ["ITEM_APPROVED", "ITEM_PENDING_RECEIPT"].includes(item.statusId);
      if (selectedStatusFilter.value === "COMPLETED") return item.statusId === "ITEM_COMPLETED";
    }
    if (selectedDiscrepancyFilter.value !== "ALL") {
      if (selectedDiscrepancyFilter.value === "UNDER_SHIPPED") return isUnderShipped(item);
      if (selectedDiscrepancyFilter.value === "UNDER_RECEIVED") return isUnderReceived(item);
      if (selectedDiscrepancyFilter.value === "OVER_RECEIVED") return isOverReceived(item);
    }
    return true;
  });

  filteredItems?.map((item: any) => {
    const product = getProduct.value(item.productId)
    if(itemsById[product.groupId]) {
      itemsById[product.groupId].push(item)
    } else {
      itemsById[product.groupId] = [item]
    }
    parentProductInfoById.value[product.groupId] = { parentProductName: product.parentProductName }
  })

  Object.entries(itemsById).map(([groupId, items]: [string, any]) => {
    let totalOrdered = 0, totalReceived = 0, totalShipped = 0, totalPrice = 0;
    items.map((item: any) => {
      if(item.quantity) totalOrdered = totalOrdered + item.quantity
      if(item.shippedQty) totalShipped = totalShipped + item.shippedQty
      if(item.receivedQty) totalReceived = totalReceived + item.receivedQty
      totalPrice = totalPrice + (item.quantity * item.unitPrice);

      parentProductInfoById.value[groupId] = {
        ...parentProductInfoById.value[groupId],
        totalOrdered,
        totalReceived,
        totalShipped,
        totalPrice
      }
    })
  })
  itemsByParentProductId.value = itemsById
}



function isOrderFinished(item?: any) {
  const order = currentOrder.value;
  const excludedOrderStatuses = ["ORDER_COMPLETED", "ORDER_REJECTED", "ORDER_CANCELLED"];
  const excludedItemStatuses = ["ITEM_CANCELLED", "ITEM_COMPLETED"];

  // Disable if order is in finished state
  if (excludedOrderStatuses.includes(order.statusId)) return true;
  // Disable if the item is in finished state
  if (item && excludedItemStatuses.includes(item.statusId)) {
    return true;
  }
  return false;
}



function getFacilityName(facilityId: string) {
  const facility = facilities.value?.find((facility: any) => facility.facilityId === facilityId)
  return facility ? facility.facilityName || facility.facilityId : facilityId
}


async function updateCarrierAndShipmentMethod(event: any, carrierPartyId: any, shipmentMethodTypeId: any) {
  carrierMethods.value = shipmentMethodsByCarrier.value[carrierPartyId]
  const isShipmentMethodUpdated = shipmentMethodTypeId ? true : false
  shipmentMethodTypeId = shipmentMethodTypeId ? shipmentMethodTypeId : carrierMethods.value?.[0]?.shipmentMethodTypeId
  try {
    const resp = await OrderService.updateOrderItemShipGroup({
      orderId: currentOrder.value.orderId,
      shipGroupSeqId: currentOrder.value.shipGroupSeqId,
      shipmentMethodTypeId : shipmentMethodTypeId ? shipmentMethodTypeId : "",
      carrierPartyId
    })

    if(!hasError(resp)) {
      const order = JSON.parse(JSON.stringify(currentOrder.value));
      order.carrierPartyId = carrierPartyId
      order.shipmentMethodTypeId = shipmentMethodTypeId;
      store.dispatch("order/updateCurrent", order)
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error);
    carrierMethods.value = shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId];
    event.target.value = isShipmentMethodUpdated ? currentOrder.value.shipmentMethodTypeId : currentOrder.value.carrierPartyId
  }
}


async function addProduct() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    showBackdrop: false,
    componentProps: {
      addProductToQueue: orderQueue.addProductToQueue,
      isProductInOrder: orderQueue.isProductInOrder,
      pendingProductIds: orderQueue.pendingProductIds.value, // Pass the actual Set
      onProductAdded: () => {
        generateItemsListByParent(); // Re-render product list to include new item
      }
    }
  });

  await addProductModal.present();
}

async function fetchOrderTimeline() {
  let timeline = [] as any;
  try {
    const resp = await OrderService.fetchOrderStatusHistory({
      inputFields: {
        orderId: props.orderId,
        orderItemSeqId_op: "empty"
      },
      entityName: "OrderStatus",
      viewSize: "100",
      sortBy: 'statusDatetime ASC',
      fieldList: ["statusId", "statusDatetime"]
    })
    if(!hasError(resp)) {
      timeline = resp.data.docs || [];

      // Add shipments to timeline
      const shipments = currentOrder.value.shipments || [];
      shipments.forEach((shipment: any) => {
        timeline.push({
          ...shipment,
          statusDatetime: Number(shipment.statusDate),
          eventType: 'SHIPMENT',
          statusDesc: translate('Shipped'), // explicitly set description
          carrierDesc: getCarrierDesc.value(shipment.routeSegCarrierPartyId),
          shipmentMethodDesc: getShipmentMethodDesc.value(shipment.routeSegShipmentMethodTypeId)
        });
      });

      // Add receipts to timeline
      const receipts = currentOrder.value.receipts || {};
      Object.keys(receipts).forEach((datetimeReceived: any) => {
        timeline.push({
          statusDatetime: Number(datetimeReceived),
          eventType: 'RECEIPT',
          statusDesc: translate('Receipt') // explicitly set description
        });
      });

      // Sort timeline chronologically
      timeline.sort((a: any, b: any) => (a.statusDatetime || 0) - (b.statusDatetime || 0));

      const firstStatus = timeline.find((event: any) => event.statusId);
      const baseTime = firstStatus ? firstStatus.statusDatetime : null;

      timeline.forEach((event: any, index: number) => {
        if (baseTime && event.statusDatetime && event !== firstStatus) {
          event["timeDiff"] = findTimeDiff(baseTime, event.statusDatetime);
        }
      });
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error);
  }
  orderTimeline.value = timeline
}

async function viewEventDetails(event: any) {
  if (!event.eventType) return;

  const modal = await modalController.create({
    component: ShipmentDetailModal,
    componentProps: {
      event,
      isReceipt: event.eventType === 'RECEIPT'
    }
  });

  await modal.present();
}

async function openOrderItemDetailActionsPopover(event: any, item: any){
  const popover = await popoverController.create({
    component: OrderItemDetailActionsPopover,
    componentProps: { item },
    event,
    showBackdrop: false,
  });

  popover.onDidDismiss().then((result) => {
    if(result.data?.isItemUpdated) generateItemsListByParent()
  })

  await popover.present();
}

function findTimeDiff(startTime: any, endTime: any) {
  if(!endTime || !startTime) {
    return ""
  }

  const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), ["years", "months", "days", "hours", "minutes"]);
  let diffString = "+ ";
  if(timeDiff.years) diffString += `${Math.round(timeDiff.years)} years `
  if(timeDiff.months) diffString += `${Math.round(timeDiff.months)} months `
  if(timeDiff.days) diffString += `${Math.round(timeDiff.days)} days `
  if(timeDiff.hours) diffString += `${Math.round(timeDiff.hours)} hours `
  if(timeDiff.minutes) diffString += `${Math.round(timeDiff.minutes)} minutes`
  return diffString
}

function formatDateTime(date: any) {
  return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
}
</script>

<style scoped>
.id {
  grid-area: id;
}

.info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(314px, 1fr));
  align-items: start;
  grid-area: cards;
}

.timeline {
  grid-area: timeline;
}

.list-item {
  --columns-desktop: 6;
}

.list-item > ion-item {
  width: 100%;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.product-header {
  background-color: var(--ion-color-light);
}

.no-pointer-events {
  pointer-events: none;
}

@media (min-width: 991px) {
  .header {
    display: grid;
    grid: "id timeline" min-content
          "cards timeline" 1fr
          / 1fr 500px;
    justify-content: space-between;  
  }

  .summary .details {
    display: flex;
  }

  .summary .info {
    flex: 1;
  }

  .summary .related-details {
    flex-basis: 343px;
  }
}
</style>
