<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button data-testid="order-detail-back-btn" slot="start" default-href="/tabs/transfers" />
        <ion-title>{{ translate("Transfer order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main data-testid="order-detail-loading" v-if="isFetchingOrderDetail">
        <div class="empty-state">
          <ProgressBar :total-items="currentOrder.totalItems || 0" :loaded-items="currentOrder.loadedItems || 0" v-if="currentOrder.isFetching" />
          <template v-else>
            <ion-spinner name="crescent" />
            <ion-label>{{ translate("Fetching order details") }}</ion-label>
          </template>
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
                <p>{{ statusFlowDesc }}</p>
              </ion-label>

            </ion-item>
          </div>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ currentOrder.originFacility?.facilityName ? currentOrder.originFacility.facilityName : getFacilityName(currentOrder.facilityId) }}</ion-card-title>
              </ion-card-header>
              <ion-item v-if="currentOrder?.facilityId" lines="none">
                <ion-icon :icon="sendOutline" slot="start" />
                <ion-label v-if="currentOrder.originFacility?.address1">
                  <h3>{{ currentOrder.originFacility.address1 }}</h3>
                  <h3 v-if="currentOrder.originFacility?.address2">{{ currentOrder.originFacility.address2 }}</h3>
                  <p>{{ currentOrder.originFacility?.city ?? "" }}{{ (currentOrder.originFacility?.city && currentOrder.originFacility?.postalCode) && ", " }}{{ currentOrder.originFacility?.postalCode ?? "" }}</p>
                  <p>{{ currentOrder.originFacility?.stateGeoName ?? "" }}{{ (currentOrder.originFacility?.stateGeoName && currentOrder.originFacility?.countryGeoName) && ", " }}{{ currentOrder.originFacility?.countryGeoName ?? "" }}</p>
                </ion-label>
                <ion-label v-else>
                  <p>{{ translate("Add address to facility in the Facilities app.") }}</p>
                </ion-label>
                <ion-button slot="end" fill="clear" color="medium" @click="viewFacilityInFacilitiesApp(currentOrder.facilityId)">
                  <ion-icon :icon="openOutline" slot="icon-only" />
                </ion-button>
              </ion-item>
              <ion-item>
                <ion-select data-testid="order-carrier-select" :label="translate('Carrier')" :value="currentOrder.carrierPartyId" interface="popover" :placeholder="translate('Select')" :disabled="isOrderFinished()" @ionChange="updateCarrierAndShipmentMethod($event, $event.detail.value, '')">
                  <ion-select-option :value="carrierPartyId" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index">{{ getCarrierDesc(carrierPartyId) ? getCarrierDesc(carrierPartyId) : carrierPartyId }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item lines="none">
                <ion-select data-testid="order-method-select" :label="translate('Method')" :value="currentOrder.shipmentMethodTypeId" v-if="carrierMethods?.length" :placeholder="translate('Select')" interface="popover" :disabled="isOrderFinished()" @ionChange="updateCarrierAndShipmentMethod($event, currentOrder.carrierPartyId, $event.detail.value)">
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
              <ion-item v-if="currentOrder?.orderFacilityId" lines="none">
                <ion-icon :icon="downloadOutline" slot="start" />
                <ion-label v-if="currentOrder.destinationFacility?.address1">
                  <h3>{{ currentOrder.destinationFacility.address1 }}</h3>
                  <h3 v-if="currentOrder.destinationFacility?.address2">{{ currentOrder.destinationFacility.address2 }}</h3>
                  <p>{{ currentOrder.destinationFacility?.city ?? "" }}{{ (currentOrder.destinationFacility?.city && currentOrder.destinationFacility?.postalCode) && ", " }}{{ currentOrder.destinationFacility?.postalCode ?? "" }}</p>
                  <p>{{ currentOrder.destinationFacility?.stateGeoName ?? "" }}{{ (currentOrder.destinationFacility?.stateGeoName && currentOrder.destinationFacility?.countryGeoName) && ", " }}{{ currentOrder.destinationFacility?.countryGeoName ?? "" }}</p>
                </ion-label>
                <ion-label v-else>
                  <p>{{ translate("Add address to facility in the Facilities app.") }}</p>
                </ion-label>
                <ion-button slot="end" fill="clear" color="medium" @click="viewFacilityInFacilitiesApp(currentOrder.orderFacilityId)">
                  <ion-icon :icon="openOutline" slot="icon-only" />
                </ion-button>
              </ion-item>
            </ion-card>
          </div>

          <div class="timeline" v-if="orderTimeline?.length">
            <ion-list data-testid="order-timeline-list" class="desktop-only">
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
            </ion-label>
          </ion-item>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Status") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-chip :outline="selectedStatusFilter !== filter.value" :data-testid="`order-status-filter-${filter.value}`" v-for="filter in availableStatusFilters" :key="filter.value" @click="handleStatusFilterChange(filter.value)">
                  <ion-label>{{ translate(filter.label) }} ({{ orderStatusCounts[filter.value] || 0 }})</ion-label>
                </ion-chip>
              </ion-card-content>
            </ion-card>

            <ion-card v-if="orderDiscrepancySummary.total">
              <ion-card-header>
                <ion-card-title>{{ translate("Discrepancies") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'ALL'" @click="handleDiscrepancyFilterChange('ALL')">
                  <ion-label>{{ translate("All") }} ({{ orderDiscrepancySummary.total }})</ion-label>
                </ion-chip>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'UNDER_SHIPPED'" v-if="orderDiscrepancySummary.underShipped" @click="handleDiscrepancyFilterChange('UNDER_SHIPPED')">
                  <ion-label>{{ translate("Under shipped") }} ({{ orderDiscrepancySummary.underShipped }})</ion-label>
                </ion-chip>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'UNDER_RECEIVED'" v-if="orderDiscrepancySummary.underReceived" @click="handleDiscrepancyFilterChange('UNDER_RECEIVED')">
                  <ion-label>{{ translate("Under received") }} ({{ orderDiscrepancySummary.underReceived }})</ion-label>
                </ion-chip>
                <ion-chip :outline="selectedDiscrepancyFilter !== 'OVER_RECEIVED'" v-if="orderDiscrepancySummary.overReceived" @click="handleDiscrepancyFilterChange('OVER_RECEIVED')">
                  <ion-label>{{ translate("Over received") }} ({{ orderDiscrepancySummary.overReceived }})</ion-label>
                </ion-chip>
              </ion-card-content>
            </ion-card>
          </div>
        </section>

        <section class="ion-margin-top">
          <ion-item lines="none" button @click="toggleSelectAll()" :detail="false">
            <ion-checkbox slot="start" :indeterminate="isIndeterminate" :checked="isAllSelected" class="no-pointer-events"></ion-checkbox>
            <ion-icon slot="start" :icon="shirtOutline" />
            <ion-label>
              <h1>{{ translate("Items") }}</h1>
            </ion-label>
          </ion-item>

          <hr />

          <DynamicScroller
            data-testid="order-items-scroller"
            :items="flattenedScrollerItems"
            :min-item-size="70"
            key-field="id"
            class="virtual-list"
            v-if="flattenedScrollerItems.length"
          >
            <template #default="{ item, active }">
              <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[item.type]">
                
                <!-- HEADER ROW -->
                <div v-if="item.type === 'header'" class="list-item product-header">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <Image :src="getProduct(item.groupItems[0].productId)?.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      {{ item.parentProductName }}
                      <p class="overline">{{ item.parentProductId }}</p>
                    </ion-label>
                  </ion-item>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ item.totalOrdered || 0 }}
                      <p>{{ translate("ordered") }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ item.totalShipped || 0 }}
                      <p>{{ translate("shipped") }}</p>
                    </ion-label>
                  </div>
                  <div class="ion-text-center ion-padding-end">
                    <ion-label>
                      {{ item.totalReceived || 0 }}
                      <p>{{ translate("received") }}</p>
                    </ion-label>
                  </div>
                </div>

                <!-- ITEM ROW -->
                <div v-else-if="item.type === 'item'" :data-testid="`order-item-row-${item.orderItemSeqId}`" class="list-item" :class="{ 'disabled': !OrderActionValidator.isItemSelectable(currentOrder, item) }" @click="OrderActionValidator.isItemSelectable(currentOrder, item) && toggleSelectedItem(item.orderItemSeqId)">
                  <div class="item-key">
                    <ion-checkbox :checked="selectedItemSeqIds.has(item.orderItemSeqId)" :disabled="!OrderActionValidator.isItemSelectable(currentOrder, item)" class="no-pointer-events"></ion-checkbox>
                    <ion-item lines="none">
                      <ion-thumbnail slot="start" v-if="!item.hasHeader">
                        <Image :src="getProduct(item.productId)?.mainImageUrl" />
                      </ion-thumbnail>
                      <ion-label class="ion-text-wrap">
                        <template v-if="!item.hasHeader">
                          <p class="overline">{{ orderParentProductInfoById[item.parentProductId]?.parentProductName }}</p>
                        </template>
                        {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                        <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                        <p v-if="item.unitPrice">{{ formatCurrency(item.unitPrice, currentOrder?.currencyUom) }}</p>
                      </ion-label>
                    </ion-item>
                  </div>

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
                  <div class="outcome"> 
                    <ion-badge :color="(STATUSCOLOR as any)[item.statusId] || 'medium'">{{ getStatusDesc(item.statusId) }}</ion-badge>
                    <ion-badge color="warning" v-if="isUnderShipped(item)" :title="translate('Under shipped')">{{ translate("Under shipped") }}</ion-badge>
                    <ion-badge color="danger" v-if="isUnderReceived(item)" :title="translate('Under received')">{{ translate("Under received") }}</ion-badge>
                    <ion-badge color="primary" v-if="isOverReceived(item)" :title="translate('Over received')">{{ translate("Over received") }}</ion-badge>
                  </div>
                  <ion-button fill="clear" color="medium" :disabled="!OrderActionValidator.getItemActions(currentOrder, item).length" @click.stop="openOrderItemDetailActionsPopover($event, item)">
                    <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
                  </ion-button>
                </div>
                
                <hr v-if="item.type === 'item' && item.isLastInGroup" />

              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
        </section>
      </main>
    </ion-content>
    <ion-footer class="desktop-only">
      <ion-toolbar>
        <ion-label v-if="selectedItemSeqIds.size">
          {{ selectedItemSeqIds.size }} {{ translate("items selected") }}
        </ion-label>
        <ion-buttons slot="end">
          <ion-button v-for="action in OrderActionValidator.getFooterActions(currentOrder, selectedItemSeqIds)" :key="action.id" :data-testid="`order-footer-${action.id.replace(/_/g,'-').toLowerCase()}`" fill="outline" :color="action.color || 'primary'" :disabled="!action.validation.allowed" @click="handleFooterAction(action)">
            <ion-icon :icon="getIcon(action.icon)" slot="start" v-if="action.icon" />
            {{ getFooterActionLabel(action) }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
    <ion-toast
      class="mobile-only"
      :is-open="selectedItemSeqIds.size > 0"
      :message="selectedItemSeqIds.size + ' ' + translate('items selected')"
      :buttons="[{
        text: translate('Actions'),
        handler: () => { openMobileActions(); return false; }
      }]"
      position="bottom"
    ></ion-toast>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, IonToast, onIonViewWillEnter, onIonViewWillLeave, actionSheetController, alertController, modalController, popoverController } from "@ionic/vue";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { chevronDownOutline, checkmarkDoneOutline, playOutline, ellipsisVerticalOutline, ticketOutline, downloadOutline, sendOutline, shirtOutline, informationCircleOutline, closeCircleOutline, openOutline, warningOutline } from "ionicons/icons";
import Image from "@/components/Image.vue";
import OrderItemDetailActionsPopover from '@/components/OrderItemDetailActionsPopover.vue';
import ShipmentDetailModal from '@/components/ShipmentDetailModal.vue';
import CancellationDetailModal from '@/components/CancellationDetailModal.vue';
import CloseFulfillmentModal from '@/components/CloseFulfillmentModal.vue';
import AddProductModal from "@/components/AddProductModal.vue"
import { useOrderQueue } from '@/composables/useProductQueue';
import { useOrderTimeline } from '@/composables/useOrderTimeline';
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";
import logger from "@/logger";
import { OrderService } from "@/services/OrderService";
import BulkReceiveModal from "@/components/BulkReceiveModal.vue";
import { hasError, STATUSCOLOR } from "@/adapter";
import { DateTime } from "luxon";
import { showToast } from "@/utils";
import emitter from "@/event-bus";
import { formatCurrency } from "@/utils";
import { OrderActionValidator, OrderFooterAction } from "@/utils/OrderActionValidator";
import ProgressBar from "@/components/ProgressBar.vue";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';

const store = useStore();

async function openMobileActions() {
  const actions = OrderActionValidator.getFooterActions(currentOrder.value, selectedItemSeqIds.value);
  
  const buttons = actions.map((action: any) => ({
    text: getFooterActionLabel(action),
    role: action.id === 'CANCEL' ? 'destructive' : undefined,
    cssClass: action.validation.allowed ? '' : 'action-disabled',
    icon: action.icon ? getIcon(action.icon) : undefined,
    handler: () => {
      if (action.validation.allowed) {
        handleFooterAction(action);
      } else {
        return false;
      }
    }
  } as any));

  buttons.push({
    text: translate("Cancel"),
    role: "cancel"
  } as any);

  const actionSheet = await actionSheetController.create({
    header: translate("Actions"),
    buttons
  });

  await actionSheet.present();
}
const productIdentificationStore = useProductIdentificationStore();
const orderQueue = useOrderQueue();
const props = defineProps(["orderId"]);

const currentOrder = computed(() => store.getters["order/getCurrent"])
const getStatusDesc = computed(() => store.getters["util/getStatusDesc"])
const selectedItemSeqIds = ref(new Set<string>())

const isAllSelected = computed(() => {
  const selectAllValidItems = OrderActionValidator.getBulkSelectableItems(currentOrder.value);
  return selectAllValidItems.length > 0 && selectedItemSeqIds.value.size === selectAllValidItems.length;
})

const isIndeterminate = computed(() => {
  const selectAllValidItems = OrderActionValidator.getBulkSelectableItems(currentOrder.value);
  return selectedItemSeqIds.value.size > 0 && selectedItemSeqIds.value.size < selectAllValidItems.length;
})

function toggleSelectedItem(itemSeqId: string) {
  const item = currentOrder.value?.items?.find((i: any) => i.orderItemSeqId === itemSeqId);
  if (!item || !OrderActionValidator.isItemSelectable(currentOrder.value, item)) return;

  const newSet = new Set(selectedItemSeqIds.value);
  if (newSet.has(itemSeqId)) {
    newSet.delete(itemSeqId)
  } else {
    newSet.add(itemSeqId)
  }
  selectedItemSeqIds.value = newSet;
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedItemSeqIds.value = new Set();
  } else {
    const selectAllValidItems = OrderActionValidator.getBulkSelectableItems(currentOrder.value);
    selectedItemSeqIds.value = new Set(selectAllValidItems.map((item: any) => item.orderItemSeqId));
  }
}

async function handleFooterAction(action: OrderFooterAction) {
  switch (action.id) {
    case 'ADD_ITEMS':
      addProduct();
      break;
    case 'CANCEL':
      if (selectedItemSeqIds.value.size > 0 && !isAllSelected.value) {
        closeSelectedItems();
      } else {
        changeOrderStatus('ORDER_CANCELLED');
      }
      break;
    case 'BULK_RECEIVE':
      openBulkReceiveModal('RECEIVE');
      break;
    case 'CLOSE_FULFILLMENT':
      openCloseFulfillmentModal();
      break;
    case 'APPROVE':
      updateOrderStatus('ORDER_APPROVED');
      break;
  }
}

function getFooterActionLabel(action: any) {
  if (action.id === 'CANCEL') {
    if (selectedItemSeqIds.value.size > 0 && !isAllSelected.value) {
      return translate("Close @size items", { size: selectedItemSeqIds.value.size }).replace('@size', String(selectedItemSeqIds.value.size))
    }
    return translate("Close order");
  }
  return translate(action.label);
}

function getIcon(iconName: string) {
  const icons = {
    shirtOutline,
    closeCircleOutline,
    playOutline,
    checkmarkDoneOutline,
    warningOutline
  } as any;
  return icons[iconName];
}

async function openBulkReceiveModal(actionType: string) {
  let selectedItems = currentOrder.value.items.filter((item: any) => selectedItemSeqIds.value.has(item.orderItemSeqId));
  
  // If no items are selected, default to all eligible items for the action
  if (selectedItems.length === 0) {
    selectedItems = currentOrder.value.items.filter((item: any) => 
      actionType === 'RECEIVE' 
        ? OrderActionValidator.validateItemAction(currentOrder.value, item, 'RECEIVE').allowed
        : OrderActionValidator.validateItemAction(currentOrder.value, item, 'FULFILL').allowed
    );
  }

  // Use originFacilityId for fulfillment (FULFILL) and orderFacilityId (destination) for receipt (RECEIVE)
  const facilityId = actionType === 'FULFILL' ? currentOrder.value.facilityId : currentOrder.value.orderFacilityId;

  const bulkReceiveModal = await modalController.create({
    component: BulkReceiveModal,
    componentProps: {
      items: selectedItems,
      actionType,
      orderId: currentOrder.value.orderId,
      facilityId,
      order: currentOrder.value
    }
  });

  bulkReceiveModal.onDidDismiss().then((result) => {
    if (result.data?.isCompleted) {
      selectedItemSeqIds.value = new Set();
      store.dispatch("order/fetchOrderDetails", props.orderId);
    }
  });

  return bulkReceiveModal.present();
}

async function openCloseFulfillmentModal() {
  const modal = await modalController.create({
    component: CloseFulfillmentModal,
    componentProps: {
      order: currentOrder.value,
      selectedItemSeqIds: selectedItemSeqIds.value
    }
  });

  modal.onDidDismiss().then(async (result) => {
    if (result.data?.isCompleted) {
      await Promise.all([
        store.dispatch("order/fetchOrderDetails", props.orderId),
        fetchOrderTimeline()
      ]);
    }
  });

  return modal.present();
}
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getProduct = computed(() => store.getters["product/getProduct"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])
const getShipmentMethodDesc = computed(() => store.getters["util/getShipmentMethodDesc"])
const facilities = computed(() => store.getters["util/getFacilitiesByProductStore"])
// disable order status updates during product processing
const isOrderStatusUpdateDisabled = computed(() => {
  return isUpdatingOrderStatus.value || orderQueue.pendingProductIds.value.size > 0;
});

const isFetchingOrderDetail = computed(() => currentOrder.value?.isFetching ?? false);

const orderItems = computed(() => currentOrder.value?.items || []);

const orderFilteredItems = computed(() => {
  return orderItems.value.filter((item: any) => {
    if (selectedStatusFilter.value !== 'ALL') {
      if (selectedStatusFilter.value === 'PENDING_FULFILLMENT') {
        return OrderActionValidator.isItemPendingFulfillment(currentOrder.value, item);
      }
      if (selectedStatusFilter.value === 'PENDING_RECEIPT') {
        return OrderActionValidator.isItemPendingReceipt(currentOrder.value, item);
      }
      if (selectedStatusFilter.value === 'COMPLETED') return item.statusId === 'ITEM_COMPLETED';
    }
    if (selectedDiscrepancyFilter.value !== 'ALL') {
      if (selectedDiscrepancyFilter.value === 'UNDER_SHIPPED') return isUnderShipped(item);
      if (selectedDiscrepancyFilter.value === 'UNDER_RECEIVED') return isUnderReceived(item);
      if (selectedDiscrepancyFilter.value === 'OVER_RECEIVED') return isOverReceived(item);
    }
    return true;
  });
});

const orderItemsByParentProductId = computed(() => {
  const itemsById = {} as Record<string, any[]>;
  orderFilteredItems.value.forEach((item: any) => {
    const product = getProduct.value(item.productId);
    const groupId = product?.groupId || product?.productId || 'UNKNOWN';
    if (!itemsById[groupId]) itemsById[groupId] = [];
    itemsById[groupId].push(item);
  });
  return itemsById;
});

const orderParentProductInfoById = computed(() => {
  const infoById = {} as Record<string, any>;
  Object.entries(orderItemsByParentProductId.value).forEach(([groupId, items]) => {
    let totalOrdered = 0, totalReceived = 0, totalShipped = 0;
    let parentProductName = '';
    items.forEach((item: any) => {
      if (item.quantity) totalOrdered += item.quantity;
      if (item.shippedQty) totalShipped += item.shippedQty;
      if (item.receivedQty) totalReceived += item.receivedQty;
      const product = getProduct.value(item.productId);
      if (product?.parentProductName) parentProductName = product.parentProductName;
    });
    infoById[groupId] = { parentProductName, totalOrdered, totalReceived, totalShipped };
  });
  return infoById;
});

const flattenedScrollerItems = computed(() => {
  const items = [] as any[];
  Object.entries(orderItemsByParentProductId.value).forEach(([parentProductId, groupItems]) => {
    const hasHeader = (groupItems as any[]).length > 1;
    
    if (hasHeader) {
      items.push({
        type: 'header',
        id: `header-${parentProductId}`,
        parentProductId,
        groupItems,
        ...orderParentProductInfoById.value[parentProductId]
      });
    }

    (groupItems as any[]).forEach((item: any, index: number) => {
      items.push({
        type: 'item',
        id: `item-${item.orderItemSeqId}`,
        parentProductId,
        hasHeader,
        isLastInGroup: index === (groupItems as any[]).length - 1,
        ...item
      });
    });
  });
  return items;
});

const { orderTimeline, fetchOrderTimeline } = useOrderTimeline(computed(() => props.orderId));
const carrierMethods = ref([]) as any;
const isUpdatingOrderStatus = ref(false);

async function closeSelectedItems() {
  const alert = await alertController.create({
    header: translate("Close items"),
    message: translate("This will cancel the unfulfilled quantity and release reservations for the selected items. This action cannot be reverted. Are you sure you want to proceed?"),
    buttons: [{
      text: translate("Dismiss"),
      role: "cancel"
    }, {
      text: translate("Confirm"),
      handler: async () => {
        try {
          const resp = await OrderService.closeFulfillment({
            orderId: currentOrder.value.orderId,
            items: Array.from(selectedItemSeqIds.value).map(id => ({ orderItemSeqId: id }))
          })

          if (!hasError(resp)) {
            showToast(translate("Items closed successfully."));
            selectedItemSeqIds.value = new Set();
            await Promise.all([
              store.dispatch("order/fetchOrderDetails", props.orderId),
              fetchOrderTimeline()
            ]);
          } else {
            throw resp.data;
          }
        } catch (error) {
          logger.error(error);
          showToast(translate("Failed to close items."));
        }
      }
    }]
  });
  alert.present();
}

const selectedStatusFilter = ref("ALL");
const selectedDiscrepancyFilter = ref("ALL");

const isExcluded = (item: any) => currentOrder.value?.statusId === "ORDER_CANCELLED" || item.statusId === "ITEM_CANCELLED";
const isReceiptFinished = (item: any) => item.statusId === "ITEM_COMPLETED";

const isUnderShipped = (item: any) => !isExcluded(item) && item.cancelQuantity > 0;
const isUnderReceived = (item: any) => !isExcluded(item) && currentOrder.value?.statusFlowId !== "TO_Fulfill_Only" && isReceiptFinished(item) && (item.receivedQty || 0) < (item.shippedQty || 0);
const isOverReceived = (item: any) => !isExcluded(item) && currentOrder.value?.statusFlowId !== "TO_Fulfill_Only" && (item.receivedQty || 0) > (item.shippedQty || 0);

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

const orderStatusCounts = computed(() => {
  const counts = { ALL: 0, PENDING_FULFILLMENT: 0, PENDING_RECEIPT: 0, COMPLETED: 0 } as any;
  orderItems.value.forEach((item: any) => {
    counts.ALL++;
    if (OrderActionValidator.isItemPendingFulfillment(currentOrder.value, item)) {
      counts.PENDING_FULFILLMENT++;
    } else if (OrderActionValidator.isItemPendingReceipt(currentOrder.value, item)) {
      counts.PENDING_RECEIPT++;
    } else if (item.statusId === "ITEM_COMPLETED") {
      counts.COMPLETED++;
    }
  });
  return counts;
});

const orderDiscrepancySummary = computed(() => {
  const summary = { total: 0, underShipped: 0, underReceived: 0, overReceived: 0 };
  orderItems.value.forEach((item: any) => {
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
}

function handleDiscrepancyFilterChange(value: string) {
  selectedDiscrepancyFilter.value = value;
  selectedStatusFilter.value = "ALL";
}

onIonViewWillEnter(async () => {
  store.dispatch("order/fetchOrderDetails", props.orderId)
  await Promise.allSettled([store.dispatch('util/fetchStatusDesc'), store.dispatch("util/fetchCarriersDetail"), fetchOrderTimeline(), store.dispatch("util/fetchShipmentMethodTypeDesc")])
  carrierMethods.value = shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
})

onIonViewWillLeave(() => {
  selectedItemSeqIds.value = new Set();
  selectedStatusFilter.value = "ALL";
  selectedDiscrepancyFilter.value = "ALL";
})



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
        // Automatically handled by reactive computed properties
      }
    }
  });

  await addProductModal.present();
}



async function viewEventDetails(event: any) {
  if (!event.eventType) return;

  const modal = await modalController.create({
    component: event.eventType === 'CANCELLATION' ? CancellationDetailModal : ShipmentDetailModal,
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

  popover.onDidDismiss().then(async (result) => {
    if(result.data?.isItemUpdated) {
      await Promise.all([
        store.dispatch("order/fetchOrderDetails", props.orderId),
        fetchOrderTimeline()
      ]);
    }
  })

  await popover.present();
}



function formatDateTime(date: any) {
  return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
}

function viewFacilityInFacilitiesApp(facilityId: string) {
  window.open(`https://facilities.hotwax.io/facility-details/${facilityId}`, '_blank', 'noopener, noreferrer');
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
  --columns-mobile: 3;
  cursor: pointer;
}

.list-item > ion-item {
  width: 100%;
}
.list-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.list-item .item-key {
  padding-inline-start: var(--spacer-sm);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-self: stretch;
}

.item-key ion-item {
  flex: 1;
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

.outcome {
  display: flex;
  gap: var(--spacer-xs);
}

.virtual-list {
  display: block;
  width: 100%;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
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

@media (max-width: 991px) {
  ion-content {
    --padding-bottom: var(--spacer-xl);
  }
}
</style>
