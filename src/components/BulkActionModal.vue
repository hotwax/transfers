<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button :disabled="isProcessing" @click="closeModal">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate(modalTitle) }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div v-if="!isProcessing && !isCompleted">
      <ion-list>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <h1>{{ translate("Confirm Action") }}</h1>
            <p>{{ translate("You are about to perform bulk action for") }} {{ items.length }} {{ translate("items.") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      
      <div class="ion-padding-top">
        <ion-button expand="block" @click="processBatches">
          {{ translate("Proceed") }}
        </ion-button>
      </div>
    </div>

    <div v-else-if="isProcessing" class="ion-text-center">
      <div class="ion-padding">
        <ion-label>
          <h1>{{ translate("Processing") }}...</h1>
          <p>{{ translate("Completed") }} {{ completedItemsCount }} / {{ items.length }}</p>
        </ion-label>
      </div>
      
      <ion-progress-bar :value="progress"></ion-progress-bar>
      
      <div class="ion-padding-top ion-margin-top ion-text-center">
        <ion-text color="danger">
          <p><strong>{{ translate("Warning: Do not close or refresh the page while the process is running.") }}</strong></p>
        </ion-text>
      </div>
    </div>

    <div v-else-if="isCompleted" class="ion-text-center">
      <div class="ion-padding">
        <ion-icon :icon="checkmarkCircleOutline" color="success" style="font-size: 64px;" />
        <h1>{{ translate("Success") }}</h1>
        <p>{{ translate("Successfully processed") }} {{ successCount }} {{ translate("items.") }}</p>
        <p v-if="errorCount > 0" class="ion-text-color-danger">
          {{ translate("Failed to process") }} {{ errorCount }} {{ translate("items.") }}
        </p>
      </div>

      <div class="ion-padding-top">
        <ion-button expand="block" @click="closeModal">
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
  IonProgressBar, 
  IonTitle, 
  IonToolbar, 
  IonText,
  modalController 
} from "@ionic/vue";
import { ref, computed } from "vue";
import { checkmarkCircleOutline, closeOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";
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
  }
});

const isProcessing = ref(false);
const isCompleted = ref(false);
const completedItemsCount = ref(0);
const successCount = ref(0);
const errorCount = ref(0);

const modalTitle = computed(() => {
  return props.actionType === 'FULFILL' ? "Bulk Fulfill" : "Bulk Receive";
});

const progress = computed(() => {
  return props.items.length > 0 ? completedItemsCount.value / props.items.length : 0;
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
  
  for (let i = 0; i < props.items.length; i += BATCH_SIZE) {
    batches.push(props.items.slice(i, i + BATCH_SIZE));
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
            quantityAccepted: (item.shippedQty || 0) - (item.receivedQty || 0),
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
