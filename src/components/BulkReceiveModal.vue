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
  </ion-header>

  <ion-content>
    <div v-if="!isProcessing && !isCompleted">
      <div class="ion-padding">
        <p v-if="props.actionType === 'RECEIVE'">{{ translate("You are about to bulk receive") }} {{ itemsToProcess.length }} {{ translate("items.") }}</p>
        <p v-else-if="props.actionType === 'FULFILL'">{{ translate("You are about to bulk fulfill") }} {{ itemsToProcess.length }} {{ translate("items.") }}</p>
        <p>
          {{ itemsToProcess.length }} {{ translate("items") }} &nbsp;·&nbsp;
          {{ totalQty }} {{ translate("units") }}
        </p>
      </div>

      <ion-list>
        <!-- Receive mode selector (RECEIVE only) -->
        <template v-if="props.actionType === 'RECEIVE'">
          <ion-list-header data-testid="bulk-modal-receive-as-header">{{ translate("Receive as") }}</ion-list-header>
          <ion-radio-group data-testid="bulk-modal-receive-mode-group" :value="receiveMode" @ionChange="receiveMode = $event.detail.value">
            <ion-item>
              <ion-radio data-testid="bulk-modal-receive-mode-issued" value="ISSUED" class="ion-text-wrap">{{ translate("Remaining issued quantity") }}</ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio data-testid="bulk-modal-receive-mode-ordered" value="ORDERED" class="ion-text-wrap">{{ translate("Remaining ordered quantity") }}</ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio data-testid="bulk-modal-receive-mode-close" value="CLOSE" class="ion-text-wrap">{{ translate("Close items with 0 receipt") }}</ion-radio>
            </ion-item>
          </ion-radio-group>
        </template>

        <ion-item data-testid="bulk-modal-pending-fulfillment-warning" v-if="pendingFulfillmentItemsCount > 0" lines="none" color="warning">
          <ion-icon :icon="informationCircleOutline" slot="start" />
          <ion-label class="ion-text-wrap">
            <p>{{ pendingFulfillmentItemsCount }} {{ translate("items are pending fulfillment and will be skipped in this bulk action.") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      
      <div class="ion-padding">
        <ion-button data-testid="bulk-modal-confirm-btn" expand="block" @click="processBatches">
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
  IonText,
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

// Receive mode: how to calculate quantityAccepted
// ORDERED = remaining ordered qty, ISSUED = remaining issued qty, CLOSE = 0
const receiveMode = ref<'ORDERED' | 'ISSUED' | 'CLOSE'>('ISSUED');

const modalTitle = computed(() => {
  return props.actionType === 'FULFILL' ? "Bulk Fulfill" : "Bulk Receive";
});

const pendingFulfillmentItemsCount = computed(() => {
  if (props.actionType === 'RECEIVE') {
    return props.items.filter((item: any) => OrderActionValidator.isItemPendingFulfillment(props.order, item)).length;
  }
  return 0;
});

const itemsToProcess = computed(() => {
  if (props.actionType === 'RECEIVE') {
    return props.items.filter((item: any) => !OrderActionValidator.isItemPendingFulfillment(props.order, item));
  }
  return props.items;
});

function getReceiveQty(item: any): number {
  if (props.actionType !== 'RECEIVE') {
    // FULFILL: qty not yet shipped
    return Math.max(0, (item.quantity || 0) - (item.shippedQty || 0));
  }
  if (receiveMode.value === 'ORDERED') {
    return Math.max(0, (item.quantity || 0) - (item.receivedQty || 0));
  }
  if (receiveMode.value === 'ISSUED') {
    return Math.max(0, (item.totalIssuedQuantity || 0) - (item.receivedQty || 0));
  }
  // CLOSE
  return 0;
}

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