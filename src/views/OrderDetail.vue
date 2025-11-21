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
                <h1>{{ currentOrder.orderName ? currentOrder.orderName : currentOrder.orderId }}</h1>
              </ion-label>
              <ion-badge :color="getColorByDesc(getStatusDesc(currentOrder.statusId)) || getColorByDesc('default')" slot="end">{{ getStatusDesc(currentOrder.statusId) }}</ion-badge>
              <ion-select v-if="currentOrder.statusId === 'ORDER_CREATED' || currentOrder.statusId === 'ORDER_APPROVED'" ref="selectRef" slot="end" aria-label="status" :value="currentOrder.statusId" selected-text=" " interface="popover" @ionChange="changeOrderStatus($event.detail.value)">
                <ion-select-option v-if="currentOrder.statusId === 'ORDER_CREATED'" value="ORDER_APPROVED">{{ translate("Approve") }}</ion-select-option>
                <ion-select-option value="ORDER_CANCELLED">{{ translate("Cancel") }}</ion-select-option>
              </ion-select>
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
              <ion-item v-for="(status, index) in orderTimeline" :key="index">
                <ion-label>
                  <p v-if="status.timeDiff">{{ status.timeDiff }}</p>
                  {{ getStatusDesc(status.statusId) }}
                </ion-label>
                <ion-note slot="end">{{ status.statusDatetime ? formatDateTime(status.statusDatetime) : '-' }}</ion-note>
              </ion-item>
            </ion-list>
          </div>
        </section>

        <section class="header" v-if="currentOrder.shipments?.length || (currentOrder?.receipts && Object.keys(currentOrder?.receipts)?.length)">
          <ion-radio-group v-model="selectedShipmentId" @ionChange="generateItemsListByParent()">
            <div class="info">
              <ion-card v-if="getFilteredShipments('OUT_TRANSFER')?.length">
                <ion-card-header>
                  <ion-card-title>{{ translate("Fulfillment") }}</ion-card-title>
                </ion-card-header>
                <ion-item v-for="(shipment, index) in getFilteredShipments('OUT_TRANSFER')" :key="index">
                  <ion-radio :value="shipment.shipmentId" label-placement="end" justify="start">
                    <ion-label>
                      {{ shipment.shipmentId }}
                      <p v-if="shipment.trackingIdNumber">{{ shipment.trackingIdNumber }}</p>
                    </ion-label>
                  </ion-radio>
                  <ion-badge slot="end" class="no-pointer-events" :color="getColorByDesc(getStatusDesc(shipment.shipmentStatusId)) || getColorByDesc('default')">{{ getStatusDesc(shipment.shipmentStatusId) }}</ion-badge>
                </ion-item>
              </ion-card>
              
              <ion-card v-if="currentOrder?.receipts && Object.keys(currentOrder.receipts)?.length">
                <ion-card-header>
                  <ion-card-title>{{ translate("Receipts") }}</ion-card-title>
                </ion-card-header>
                <ion-item v-for="datetimeReceived in getReceipts()" :key="datetimeReceived">
                  <ion-radio :value="`receipt_${datetimeReceived}`" label-placement="end" justify="start">
                    <ion-label>
                      {{ translate("received at") }} 
                      <p>{{ formatDateTime(Number(datetimeReceived)) }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-card>
            </div>
          </ion-radio-group>
          <div class="timeline" v-if="selectedShipmentId">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ getSelectedShipment()?.datetimeReceived ? translate("Receipt details") : translate("Shipment details") }}</ion-card-title>
                <ion-button fill="clear" color="medium" @click="selectedShipmentId = ''; generateItemsListByParent()">
                  <ion-icon :icon="closeCircleOutline" slot="icon-only" />
                </ion-button>
              </ion-card-header>
              <!-- For receipts only show received date -->
              <template v-if="getSelectedShipment()?.datetimeReceived">
                <ion-item>
                  <ion-label>{{ translate("Received date") }}</ion-label>
                  <ion-label slot="end">{{ formatDateTime(getSelectedShipment().datetimeReceived) }}</ion-label>
                </ion-item>
              </template>
              <!-- For shipments -->
              <template v-else>
                <ion-item>
                  <ion-label>{{ translate("Shipped date") }}</ion-label>
                  <ion-label slot="end">{{ getSelectedShipment()?.shipmentShippedDate ? formatDateTime(getSelectedShipment().shipmentShippedDate) : "-" }}</ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>{{ translate("Method") }}</ion-label>
                  <ion-label slot="end">{{ getSelectedShipment()?.routeSegShipmentMethodTypeId ? getShipmentMethodDesc(getSelectedShipment().routeSegShipmentMethodTypeId) : "-" }}</ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>{{ translate("Carrier") }}</ion-label>
                  <ion-label slot="end">{{ getSelectedShipment()?.routeSegCarrierPartyId ? getCarrierDesc(getSelectedShipment().routeSegCarrierPartyId) : "-" }}</ion-label>
                </ion-item>
                <ion-item lines="none">
                  <ion-label>{{ translate("Tracking code") }}</ion-label>
                  <ion-label slot="end">{{ getSelectedShipment()?.trackingIdNumber ? getSelectedShipment().trackingIdNumber : "-" }}</ion-label>
                </ion-item>
              </template>
            </ion-card>
          </div>
        </section>

        <section class="ion-margin-top">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="shirtOutline" />
            <ion-label>
              <h1>{{ translate("Items") }}</h1>
              <p>{{ translate(selectedShipmentId ? "Showing items for selected shipment" : "Showing all order items") }}</p>
            </ion-label>
            <ion-button size="default" fill="outline" color="medium" v-if="!selectedShipmentId" :disabled="currentOrder.statusId !== 'ORDER_CREATED'" @click="addProduct()">
              {{ translate("Add item to transfer") }}
            </ion-button>
          </ion-item>

          <hr />

          <template v-for="([parentProductId, items], index) in Object.entries(itemsByParentProductId)" :key="index">
            <template v-if="items.length">
              <div class="list-item product-header">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <Image :src="getProduct(items[0].productId)?.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    {{ parentProductInfoById[parentProductId]?.parentProductName }}
                    <p class="overline">{{ parentProductId }}</p>
                  </ion-label>
                </ion-item>
                <template v-if="selectedShipmentId">
                  <div></div>
                  <ion-label>
                    {{ parentProductInfoById[parentProductId]?.totalOrdered || 0 }}
                    <p>{{ translate(getSelectedShipment()?.shipmentTypeId === "OUT_TRANSFER" ? "shipped" : "received") }}</p>
                  </ion-label>
                  <div colspan="2"></div>
                </template>
                <template v-else>
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
                </template>
              </div>

              <div class="list-item" v-for="(item, index) in items" :key="index">
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">
                    {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                    <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  </ion-label>
                </ion-item>

                <template v-if="selectedShipmentId">
                  <div></div>
                  <div class="tablet ion-text-center">
                    <ion-chip outline>
                      <ion-icon :icon="getSelectedShipment()?.shipmentTypeId === 'OUT_TRANSFER' ? sendOutline : downloadOutline" />
                      <ion-label>{{ item.quantity || 0 }}</ion-label>
                    </ion-chip>
                  </div>
                  <div></div>
                </template>
                <template v-else>
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
                  <ion-badge :color="getColorByDesc(getStatusDesc(item.statusId)) || getColorByDesc('default')">{{ getStatusDesc(item.statusId) }}</ion-badge>
                </template>
                <ion-button slot="end" fill="clear" color="medium" :disabled="isOrderFinished(item)" @click="openOrderItemDetailActionsPopover($event, item)">
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
import { IonBackButton,IonBadge, IonButton, IonCard, IonCardHeader, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRadio, IonRadioGroup, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter, alertController, modalController, popoverController } from "@ionic/vue";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { ellipsisVerticalOutline, ticketOutline, downloadOutline, sendOutline, shirtOutline, informationCircleOutline, closeCircleOutline } from "ionicons/icons";
import Image from "@/components/Image.vue";
import OrderItemDetailActionsPopover from '@/components/OrderItemDetailActionsPopover.vue';
import AddProductModal from "@/components/AddProductModal.vue"
import { useOrderQueue } from '@/composables/useProductQueue';
import { computed, defineProps, ref } from "vue";
import { useStore } from "vuex";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import { hasError } from "@/adapter";
import { DateTime } from "luxon";
import { getColorByDesc, showToast} from "@/utils";
import { formatCurrency } from "@/utils";

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

const isFetchingOrderDetail = ref(false);
const selectedShipmentId = ref("");
const itemsByParentProductId = ref({}) as any;
const parentProductInfoById = ref({}) as any;
const orderTimeline = ref([]) as any;
const carrierMethods = ref([])
const selectRef = ref("") as any;

onIonViewWillEnter(async () => {
  isFetchingOrderDetail.value = true;
  await store.dispatch("order/fetchOrderDetails", props.orderId)
  await Promise.allSettled([store.dispatch("util/fetchFacilitiesByCurrentStore", currentOrder.value.productStoreId), store.dispatch('util/fetchStatusDesc'), store.dispatch("util/fetchCarriersDetail"), fetchOrderStatusHistoryTimeline(), store.dispatch("util/fetchShipmentMethodTypeDesc")])
  generateItemsListByParent();
  isFetchingOrderDetail.value = false;
  carrierMethods.value = shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
})

function getReceipts(): string[] {
  if (!currentOrder.value?.receipts) return [];

  return Object.keys(currentOrder.value.receipts)
    .sort((a, b) => Number(b) - Number(a)); // returns sorted strings
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
      handler: () => {
        selectRef.value.$el.value = currentOrder.value
      }
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
        fetchOrderStatusHistoryTimeline()
      ]);
      generateItemsListByParent();
    } else {
      throw resp.data;
    }
  } catch(error) {
    logger.error(error)
    showToast(translate("Failed to update order status."))
    selectRef.value.$el.value = currentOrder.value
  }
}

function generateItemsListByParent() {
  const itemsById = {} as any;

  let itemsList = [];
  if(selectedShipmentId.value) {
    if (selectedShipmentId.value.startsWith("receipt_")) {
      const datetimeReceived = selectedShipmentId.value.replace(/^receipt_/, "");
      itemsList = currentOrder.value.receipts[datetimeReceived]
    } else {
      const shipment = currentOrder.value.shipments.find((shipment: any) => shipment.shipmentId === selectedShipmentId.value);
      // Flatten all items from all packages into a single array
      itemsList = shipment?.packages.flatMap((pkg: any) => pkg.items || [])
    }
  } else {
    itemsList = currentOrder.value.items
  }

  itemsList?.map((item: any) => {
    const product = getProduct.value(item.productId)
    if(itemsById[product.groupId]) {
      itemsById[product.groupId].push(item)
    } else {
      itemsById[product.groupId] = [item]
    }
    parentProductInfoById.value[product.groupId] = { parentProductName: product.parentProductName }
  })

  Object.entries(itemsById).map(([groupId, items], index) => {
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

function getFilteredShipments(shipmentTypeId: string) {
  return currentOrder.value.shipments?.filter((shipment: any) => shipment.shipmentTypeId === shipmentTypeId); 
}

// Returns shipment data for selected shipment ID or creates receipt data structure for receipt selections
function getSelectedShipment() {
  if (selectedShipmentId.value.startsWith("receipt_")) {
    const datetimeReceived = selectedShipmentId.value.replace(/^receipt_/, "");
    return {
      datetimeReceived: Number(datetimeReceived),
    };
  }
  
  return currentOrder.value.shipments.find((shipment: any) => shipment.shipmentId === selectedShipmentId.value);
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

async function fetchOrderStatusHistoryTimeline() {
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
    if(!hasError(resp) && resp.data.docs?.length) {
      timeline = resp.data.docs

      timeline.map((status: any, index: number) => {
        if(index > 0) {
          status["timeDiff"] = findTimeDiff(timeline[0].statusDatetime, status.statusDatetime)
        }
      })
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error);
  }
  orderTimeline.value = timeline
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
}
</style>
