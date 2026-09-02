<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button :aria-label="translate('Close')" @click="modalController.dismiss()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Create inventory transfer') }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-list lines="full">
      <ion-item>
        <ion-select v-model="facilityId" :label="translate('Source facility')" label-placement="stacked" interface="popover">
          <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
            {{ facility.facilityName || facility.facilityId }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select v-model="facilityIdTo" :label="translate('Destination facility')" label-placement="stacked" interface="popover">
          <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
            {{ facility.facilityName || facility.facilityId }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item><ion-input v-model="productId" :label="translate('Product ID')" label-placement="stacked" /></ion-item>
      <ion-item><ion-input v-model.number="quantity" type="number" inputmode="decimal" :min="0" :label="translate('Quantity')" label-placement="stacked" /></ion-item>
      <ion-item><ion-input v-model="orderId" :label="translate('Order ID')" label-placement="stacked" /></ion-item>
      <ion-item><ion-input v-model="orderItemSeqId" :label="translate('Order item sequence ID')" label-placement="stacked" /></ion-item>
      <ion-item><ion-textarea v-model="comments" :label="translate('Comments')" label-placement="stacked" :rows="3" /></ion-item>
    </ion-list>
    <ion-note v-if="validationMessage" color="danger">{{ validationMessage }}</ion-note>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="submitting || !canSubmit" :aria-label="translate('Create inventory transfer')" @click="submit">
        <ion-icon :icon="sendOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput,
  IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar,
  modalController,
} from '@ionic/vue';
import { closeOutline, sendOutline } from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { translate } from '@common';
import { useInventoryTransferStore } from '@/store/inventoryTransfer';
import { useProductStore } from '@/store/productStore';

const transferStore = useInventoryTransferStore();
const productStore = useProductStore();
const facilityId = ref('');
const facilityIdTo = ref('');
const productId = ref('');
const quantity = ref<number | null>(null);
const orderId = ref('');
const orderItemSeqId = ref('');
const comments = ref('');
const submitting = ref(false);
const submitFailed = ref(false);
const facilities = computed(() => productStore.getAllFacilities);
const sameFacility = computed(() => Boolean(facilityId.value && facilityId.value === facilityIdTo.value));
const canSubmit = computed(() => Boolean(
  facilityId.value && facilityIdTo.value && productId.value.trim() && Number(quantity.value) > 0 && !sameFacility.value
));
const validationMessage = computed(() => {
  if (submitFailed.value) return translate('Failed to create inventory transfer.');
  if (sameFacility.value) return translate('Source and destination must be different.');
  return '';
});

onMounted(() => productStore.fetchAllFacilities());

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  submitFailed.value = false;
  try {
    const response: any = await transferStore.createInventoryTransfer({
      facilityId: facilityId.value,
      facilityIdTo: facilityIdTo.value,
      productId: productId.value.trim(),
      quantity: Number(quantity.value),
      orderId: orderId.value.trim() || undefined,
      orderItemSeqId: orderItemSeqId.value.trim() || undefined,
      comments: comments.value.trim() || undefined,
    });
    await modalController.dismiss({ inventoryTransferId: response.data?.inventoryTransferId }, 'confirm');
  } catch {
    submitFailed.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>ion-content { --padding-bottom: 80px; }</style>
