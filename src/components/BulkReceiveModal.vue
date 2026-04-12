<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="bulk-modal-close-btn" :disabled="isProcessing" @click="closeModal">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate(modalTitle) }}</ion-title>
    </ion-toolbar>
    <ion-progress-bar :value="discrepancyImpact.progressValue" :color="discrepancyImpact.color"></ion-progress-bar>
  </ion-header>

  <ion-content>
    <div v-if="!isProcessing && !isCompleted">
      <ion-list lines="none">
        <ion-list-header>
          <p v-if="props.actionType === 'RECEIVE'">{{ translate("You are about to bulk receive") }} {{
            itemsToProcess.length }} {{ translate("items.") }}</p>
          <p v-else-if="props.actionType === 'FULFILL'">{{ translate("You are about to bulk fulfill") }} {{
            itemsToProcess.length }} {{ translate("items.") }}</p>
        </ion-list-header>
        <ion-accordion-group>
          <ion-accordion value="summary">
            <ion-item slot="header" color="light">
              <ion-label>
                {{ translate("To be received") }}
                <p>{{ totalQty }} {{ translate("units") }}</p>
              </ion-label>
              <ion-badge slot="end" :color="discrepancyImpact.color">
                {{ discrepancyImpact.delta > 0 ? '+' : '' }}{{ discrepancyImpact.delta }} {{ translate("discrepancy") }}
              </ion-badge>
            </ion-item>
            <div slot="content">
              <ion-item lines="none">
                <ion-label>
                  <h3>{{ translate("Total Ordered") }}</h3>
                  <p>{{ summaryTotals.orderedUnits }} {{ translate("units") }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label>
                  <h3>{{ translate("Total Shipped") }}</h3>
                  <p>{{ summaryTotals.shippedUnits }} {{ translate("units") }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label>
                  <h3>{{ translate("Already Received") }}</h3>
                  <p>{{ summaryTotals.receivedUnits }} {{ translate("units") }}</p>
                </ion-label>
              </ion-item>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </ion-list>

      <ion-list>
        <!-- Receive mode selector (RECEIVE only) -->
        <template v-if="props.actionType === 'RECEIVE'">
          <ion-list-header data-testid="bulk-modal-receive-as-header">{{ translate("Receive as") }}</ion-list-header>
          <ion-radio-group data-testid="bulk-modal-receive-mode-group" :value="receiveMode" @ionChange="receiveMode = $event.detail.value">
            <ion-item>
              <ion-radio data-testid="bulk-modal-receive-mode-issued" value="ISSUED" class="ion-text-wrap" :disabled="!isIssuedQtyAvailable">
                <ion-label>{{ translate("Remaining shipped quantity") }}
                  <p v-if="isIssuedQtyAvailable">{{ getModePreview('ISSUED') }} {{ translate("unit discrepancy") }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio data-testid="bulk-modal-receive-mode-ordered" value="ORDERED" class="ion-text-wrap">
                <ion-label>{{ translate("Remaining ordered quantity") }}
                  <p>{{ getModePreview('ORDERED') > 0 ? '+' : '' }}{{ getModePreview('ORDERED') }} {{ translate("unit discrepancy") }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio data-testid="bulk-modal-receive-mode-close" value="CLOSE" class="ion-text-wrap">
                <ion-label>{{ translate("Close items with 0 receipt") }}
                  <p>{{ getModePreview('CLOSE') }} {{ translate("unit discrepancy") }}</p>
                </ion-label>  
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </template>

        <ion-item data-testid="bulk-modal-item-to-process-warning" v-if="itemsToProcess.length === 0" lines="none" color="warning">
          <ion-icon :icon="informationCircleOutline" slot="start" />
          <ion-label class="ion-text-wrap">
            <p>{{ translate("No items are available for this bulk action.") }}</p>
          </ion-label>
        </ion-item>

        <ion-item data-testid="bulk-modal-pending-fulfillment-warning" v-if="itemsToProcess.length > 0 && pendingFulfillmentItemsCount > 0" lines="none" color="warning">
          <ion-icon :icon="informationCircleOutline" slot="start" />
          <ion-label class="ion-text-wrap">
            <p>{{ pendingFulfillmentItemsCount }} {{ translate("items are pending fulfillment and will be skipped in this bulk action.") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      
      <div class="ion-padding">
        <ion-button :disabled="itemsToProcess.length === 0" data-testid="bulk-modal-confirm-btn" expand="block" @click="processBatches">
          {{ translate("Proceed") }}
        </ion-button>
      </div>
    </div>

    <div v-else-if="isProcessing" class="ion-text-center">
      <div class="ion-padding">
        <ion-label>
          <p>{{ translate("Processing") }}...</p>
          <p v-if="props.actionType === 'RECEIVE'">{{ translate("Received") }} {{ completedItemsCount }} / {{ itemsToProcess.length }}</p>
          <p v-else-if="props.actionType === 'FULFILL'">{{ translate("Fulfilled") }} {{ completedItemsCount }} / {{ itemsToProcess.length }}</p>
          <p v-else>{{ translate("Completed") }} {{ completedItemsCount }} / {{ itemsToProcess.length }}</p>
        </ion-label>
      </div>
      
      <ion-progress-bar data-testid="bulk-modal-progress" :value="progress"></ion-progress-bar>
      
      <div class="ion-padding">
        <ion-text color="danger">
          <p>{{ translate("Warning: Do not close or refresh the page while the process is running.") }}</p>
        </ion-text>
      </div>
    </div>

    <div v-else-if="isCompleted" class="ion-text-center">
      <div class="ion-padding">
        <ion-icon :icon="checkmarkCircleOutline" color="success" style="font-size: 64px;" />
        <p>{{ translate("Success") }}</p>
        <p v-if="props.actionType === 'RECEIVE'">{{ translate("Successfully received") }} <span data-testid="bulk-results-success-count">{{ successCount }}</span> {{ translate("items.") }}</p>
        <p v-else-if="props.actionType === 'FULFILL'">{{ translate("Successfully fulfilled") }} <span data-testid="bulk-results-success-count">{{ successCount }}</span> {{ translate("items.") }}</p>
        <p v-else>{{ translate("Successfully processed") }} <span data-testid="bulk-results-success-count">{{ successCount }}</span> {{ translate("items.") }}</p>
        <p v-if="errorCount > 0" class="ion-text-color-danger">
          {{ translate("Failed to process") }} <span data-testid="bulk-results-fail-count">{{ errorCount }}</span> {{ translate("items.") }}
        </p>
      </div>

      <div class="ion-padding">
        <ion-button data-testid="bulk-modal-done-btn" expand="block" @click="closeModal">
          {{ translate("Done") }}
        </ion-button>
      </div>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { 
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton, 
  IonButtons, 
  IonContent, 
  IonHeader, 
  IonIcon, 
  IonItem, 
  IonLabel, 
  IonList,
  IonListHeader,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonTitle, 
  IonToolbar, 
  modalController 
} from "@ionic/vue";
import { ref, computed } from "vue";
import { checkmarkCircleOutline, closeOutline, informationCircleOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";
import { OrderActionValidator } from "@/utils/OrderActionValidator";
import logger from "@/logger";

const props = defineProps({
  items: {
    type: Array as any,
    required: true
  },
  actionType: {
    type: String, // 'FULFILL' or 'RECEIVE'
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  facilityId: {
    type: String,
    required: true
  },
  order: {
    type: Object as any,
    required: true
  }
});

const isProcessing = ref(false);
const isCompleted = ref(false);
const completedItemsCount = ref(0);
const successCount = ref(0);
const errorCount = ref(0);

const itemsToProcess = computed(() => {
  if (props.actionType === 'RECEIVE') {
    return props.items.filter((item: any) => !OrderActionValidator.isItemPendingFulfillment(props.order, item));
  }
  return props.items;
});

const isIssuedQtyAvailable = computed(() => itemsToProcess.value.some((item: any) => (item.totalIssuedQuantity || 0) > 0));

// Receive mode: how to calculate quantityAccepted
// ORDERED = remaining ordered qty, ISSUED = remaining issued qty, CLOSE = 0
const receiveMode = ref<'ORDERED' | 'ISSUED' | 'CLOSE'>(isIssuedQtyAvailable.value ? 'ISSUED' : 'ORDERED');

const modalTitle = computed(() => {
  return props.actionType === 'FULFILL' ? "Bulk Fulfill" : "Bulk Receive";
});

const pendingFulfillmentItemsCount = computed(() => {
  if (props.actionType === 'RECEIVE') {
    return props.items.filter((item: any) => OrderActionValidator.isItemPendingFulfillment(props.order, item)).length;
  }
  return 0;
});

function getReceiveQtyForMode(item: any, mode: string): number {
  if (props.actionType !== 'RECEIVE') {
    // FULFILL: qty not yet shipped
    return Math.max(0, (item.quantity || 0) - (item.shippedQty || 0));
  }
  if (mode === 'ORDERED') {
    return Math.max(0, (item.quantity || 0) - (item.receivedQty || 0));
  }
  if (mode === 'ISSUED') {
    return Math.max(0, (item.totalIssuedQuantity || 0) - (item.receivedQty || 0));
  }
  // CLOSE
  return 0;
}

function getReceiveQty(item: any): number {
  return getReceiveQtyForMode(item, receiveMode.value);
}

const summaryTotals = computed(() => {
  return itemsToProcess.value.reduce((acc: any, item: any) => {
    acc.orderedUnits += (item.quantity || 0);
    acc.shippedUnits += (item.totalIssuedQuantity || 0);
    acc.receivedUnits += (item.receivedQty || 0);
    return acc;
  }, { orderedUnits: 0, shippedUnits: 0, receivedUnits: 0 });
});

const getModePreview = (mode: string) => {
  const toReceive = itemsToProcess.value.reduce((sum: number, item: any) => sum + getReceiveQtyForMode(item, mode), 0);
  const delta = (summaryTotals.value.receivedUnits + toReceive) - summaryTotals.value.shippedUnits;
  return delta;
}

const discrepancyImpact = computed(() => {
  const delta = getModePreview(receiveMode.value);
  const newReceivedTotal = summaryTotals.value.receivedUnits + totalQty.value;
  const progressValue = summaryTotals.value.shippedUnits > 0 ? newReceivedTotal / summaryTotals.value.shippedUnits : (newReceivedTotal > 0 ? 1 : 0);
  return {
    delta,
    progressValue,
    color: delta === 0 ? 'success' : 'danger'
  }
});

const totalQty = computed(() =>
  itemsToProcess.value.reduce((sum: number, item: any) => sum + getReceiveQty(item), 0)
);

const progress = computed(() => {
  return itemsToProcess.value.length > 0 ? completedItemsCount.value / itemsToProcess.value.length : 0;
});

const closeModal = () => {
  modalController.dismiss({
    isCompleted: isCompleted.value
  });
};

const processBatches = async () => {
  isProcessing.value = true;
  const BATCH_SIZE = 200;
  const batches = [];
  
  for (let i = 0; i < itemsToProcess.value.length; i += BATCH_SIZE) {
    batches.push(itemsToProcess.value.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      if (props.actionType === 'FULFILL') {
        const payload = {
          orderId: props.orderId,
          originFacilityId: props.facilityId,
          shipmentTypeId: 'TRANSFER_SHIPMENT',
          items: batch.map((item: any) => ({
            orderItemSeqId: item.orderItemSeqId,
            productId: item.productId,
            quantity: item.quantity - (item.shippedQty || 0)
          }))
        };
        
        const resp = await OrderService.createTransferOrderShipment(payload);
        if (resp.status === 200 && resp.data.shipmentId) {
          await OrderService.shipTransferOrderShipment({ 
            shipmentId: resp.data.shipmentId,
            orderId: props.orderId
          });
          successCount.value += batch.length;
        } else {
          errorCount.value += batch.length;
          logger.error("Failed to create shipment for batch", resp);
        }
      } else if (props.actionType === 'RECEIVE') {
        const payload = {
          orderId: props.orderId,
          facilityId: props.facilityId,
          items: batch.map((item: any) => ({
            orderItemSeqId: item.orderItemSeqId,
            productId: item.productId,
            quantityAccepted: getReceiveQty(item),
            statusId: 'ITEM_COMPLETED'
          }))
        };
        
        const resp = await OrderService.receiveTransferOrder(payload);
        if (resp.status === 200) {
          successCount.value += batch.length;
        } else {
          errorCount.value += batch.length;
          logger.error("Failed to receive batch", resp);
        }
      }
    } catch (err) {
      errorCount.value += batch.length;
      logger.error("Error processing batch", err);
    }
    
    completedItemsCount.value += batch.length;
  }

  isProcessing.value = false;
  isCompleted.value = true;
};
</script>