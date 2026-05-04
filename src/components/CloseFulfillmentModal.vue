<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="close-fulfillment-back-btn" @click="closeModal">
          <ion-icon slot="icon-only" :icon="arrowBackOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Close Fulfillment") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="!isProcessing && !isCompleted">
      <div class="ion-padding">
        <p>{{ translate("The following unfulfilled quantities will be cancelled and reservations released.") }}</p>
        <p>
          <ion-text color="danger">
            {{ pendingItems.length }} {{ translate("items") }} &nbsp;·&nbsp; {{ totalCancelQty }} {{ translate("units will be cancelled") }}
          </ion-text>
        </p>
      </div>

      <ion-list data-testid="close-fulfillment-list">
        <ion-item v-for="item in previewItems" :key="item.orderItemSeqId" :data-testid="`close-fulfillment-item-${item.orderItemSeqId}`">
          <ion-thumbnail slot="start">
            <Image :src="getProduct(item.productId)?.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <h2>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId)?.productName }}</h2>
            <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
            <p>
              <ion-text>{{ translate("Fulfilled qty") }}: {{ item.totalIssuedQuantity || 0 }}</ion-text>
              &nbsp;|&nbsp;
              <ion-text color="danger">{{ translate("Cancel qty") }}: {{ cancelQty(item) }}</ion-text>
            </p>
          </ion-label>
        </ion-item>

        <ion-item v-if="pendingItems.length > PREVIEW_LIMIT" lines="none">
          <ion-label color="medium">
            <p>{{ translate("and") }} {{ pendingItems.length - PREVIEW_LIMIT }} {{ translate("more items…") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <div class="ion-padding">
        <ion-button data-testid="close-fulfillment-confirm-btn" expand="block" color="warning" :disabled="!pendingItems.length || isProcessing" @click="confirmClose">
          {{ translate("Close Fulfillment") }}
        </ion-button>
      </div>
    </div>

    <div v-else-if="isProcessing" class="ion-text-center">
      <div class="ion-padding">
        <ion-label>
          <p>{{ translate("Closing fulfillment") }}...</p>
          <p>{{ translate("Completed") }} {{ completedItemsCount }} / {{ pendingItems.length }}</p>
        </ion-label>
      </div>
      
      <ion-progress-bar :value="progress"></ion-progress-bar>
      
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
        <p>{{ translate("Successfully closed fulfillment for") }} {{ successCount }} {{ translate("items.") }}</p>
        <p v-if="errorCount > 0" class="ion-text-color-danger">
          {{ translate("Failed to process") }} {{ errorCount }} {{ translate("items.") }}
        </p>
      </div>

      <div class="ion-padding">
        <ion-button data-testid="close-fulfillment-done-btn" expand="block" @click="closeModal({ isCompleted: true })">
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
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonProgressBar,
  IonText,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  alertController,
  modalController,
} from '@ionic/vue';
import { arrowBackOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { OrderService } from '@/services/OrderService';
import { showToast } from '@/utils';
import { hasError } from '@/adapter';
import Image from '@/components/Image.vue';
import { OrderActionValidator } from '@/utils/OrderActionValidator';
import logger from '@/logger';

const props = defineProps<{ order: any; selectedItemSeqIds?: Set<string> }>();

const PREVIEW_LIMIT = 10;

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();
const getProduct = computed(() => store.getters['product/getProduct']);
const isProcessing = ref(false);
const isCompleted = ref(false);
const completedItemsCount = ref(0);
const successCount = ref(0);
const errorCount = ref(0);

// If selectedItemSeqIds has a partial selection, scope to those items only.
// No selection (or selecting everything) means act on all eligible items.
const pendingItems = computed(() => {
  const allPending = (props.order.items || []).filter((item: any) => OrderActionValidator.isItemPendingFulfillment(props.order, item));
  const sel = props.selectedItemSeqIds;
  if (!sel || sel.size === 0 || sel.size === allPending.length) return allPending;
  return allPending.filter((item: any) => sel.has(item.orderItemSeqId));
});

const previewItems = computed(() => pendingItems.value.slice(0, PREVIEW_LIMIT));

const totalCancelQty = computed(() =>
  pendingItems.value.reduce((sum: number, item: any) => sum + cancelQty(item), 0)
);

const progress = computed(() => {
  return pendingItems.value.length > 0 ? completedItemsCount.value / pendingItems.value.length : 0;
});

function cancelQty(item: any): number {
  return Math.max(0, (item.quantity || 0) - (item.totalIssuedQuantity || 0));
}

function closeModal(data = {}) {
  modalController.dismiss(data);
}

async function confirmClose() {
  const alert = await alertController.create({
    header: translate('Close Fulfillment'),
    message: translate("The unfulfilled quantities listed above will be cancelled and cannot be recovered. Are you sure you want to proceed?"),
    buttons: [
      { text: translate('Dismiss'), role: 'cancel' },
      {
        text: translate('Proceed'),
        handler: () => { runCloseFulfillment(); }
      }
    ]
  });
  await alert.present();
}

async function runCloseFulfillment() {
  isProcessing.value = true;
  const PAGE_SIZE = 200;
  const allItems = pendingItems.value.map((item: any) => ({ orderItemSeqId: item.orderItemSeqId }));

  for (let i = 0; i < allItems.length; i += PAGE_SIZE) {
    const chunk = allItems.slice(i, i + PAGE_SIZE);
    try {
      const resp = await OrderService.closeFulfillment({
        orderId: props.order.orderId,
        items: chunk
      });
      if (!hasError(resp)) {
        successCount.value += chunk.length;
      } else {
        errorCount.value += chunk.length;
        logger.error("Failed to close fulfillment for batch", resp);
      }
    } catch (error) {
      errorCount.value += chunk.length;
      logger.error("Error processing batch", error);
    }
    completedItemsCount.value += chunk.length;
  }

  isProcessing.value = false;
  isCompleted.value = true;
}
</script>
