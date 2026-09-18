<template>
  <InventoryTransferProductSearchModal
    v-if="activePage === 'product'"
    embedded
    selection-mode
    :selected-product-id="productId"
    @close="activePage = 'form'"
    @select="applySelectedProduct"
  />
  <InventoryTransferOrderItemSearchModal
    v-else-if="activePage === 'order-item'"
    embedded
    @close="activePage = 'form'"
    @select="applySelectedOrderItem"
  />
  <template v-else>
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
        <ion-select
          v-model="facilityId"
          :label="requiredLabel('Source facility')"
          label-placement="stacked"
          interface="popover"
          required
        >
          <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
            {{ facility.facilityName || facility.facilityId }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select
          v-model="facilityIdTo"
          :label="requiredLabel('Destination facility')"
          label-placement="stacked"
          interface="popover"
          required
        >
          <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
            {{ facility.facilityName || facility.facilityId }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item
        button
        detail
        data-testid="select-transfer-product"
        aria-required="true"
        @click="selectProduct"
      >
        <ion-label>
          <p>{{ requiredLabel('Product') }}</p>
          {{ selectedProductLabel }}
        </ion-label>
      </ion-item>
      <ion-item>
        <ion-input
          v-model.number="quantity"
          type="number"
          inputmode="decimal"
          :min="1"
          :label="requiredLabel('Quantity')"
          label-placement="stacked"
          required
        />
      </ion-item>
      <ion-item
        button
        detail
        data-testid="select-transfer-order-item"
        @click="selectOrderItem"
      >
        <ion-label>
          <p>{{ translate('Sales order item') }}</p>
          {{ selectedOrderItemLabel }}
        </ion-label>
        <ion-button v-if="selectedOrderItem" slot="end" fill="clear" @click.stop="clearOrderItem">
          {{ translate('Clear') }}
        </ion-button>
      </ion-item>
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
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar,
  modalController,
} from '@ionic/vue';
import { closeOutline, sendOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { translate } from '@common';
import InventoryTransferOrderItemSearchModal from '@/components/InventoryTransferOrderItemSearchModal.vue';
import InventoryTransferProductSearchModal from '@/components/InventoryTransferProductSearchModal.vue';
import type { InventoryTransferOrderItemSummary } from '@/composables/useInventoryTransferOrderItemSearch';
import type { InventoryTransferProductSummary } from '@/composables/useInventoryTransferProductSearch';
import { useInventoryTransferStore } from '@/store/inventoryTransfer';
import { useProductStore } from '@/store/productStore';

const transferStore = useInventoryTransferStore();
const productStore = useProductStore();
const activePage = ref<'form' | 'product' | 'order-item'>('form');
const facilityId = ref('');
const facilityIdTo = ref('');
const productId = ref('');
const quantity = ref<number | null>(null);
const orderId = ref('');
const orderItemSeqId = ref('');
const selectedProduct = ref<InventoryTransferProductSummary | null>(null);
const selectedOrderItem = ref<InventoryTransferOrderItemSummary | null>(null);
const comments = ref('');
const submitting = ref(false);
const submitFailed = ref(false);
const facilities = computed(() => productStore.getAllFacilities);
const selectedProductLabel = computed(() => selectedProduct.value?.sku
  || selectedProduct.value?.productName
  || selectedProduct.value?.internalName
  || productId.value
  || translate('Select product'));
const selectedOrderItemLabel = computed(() => selectedOrderItem.value?.orderName
  || selectedOrderItem.value?.orderId
  || translate('Select sales order item'));
const sameFacility = computed(() => Boolean(facilityId.value && facilityId.value === facilityIdTo.value));
const canSubmit = computed(() => Boolean(
  facilityId.value && facilityIdTo.value && productId.value.trim() && Number(quantity.value) > 0 && !sameFacility.value
));
const validationMessage = computed(() => {
  if (submitFailed.value) return translate('Failed to create inventory transfer.');
  if (sameFacility.value) return translate('Source and destination must be different.');
  return '';
});

function requiredLabel(label: string) {
  return `${translate(label)} *`;
}

function selectProduct() {
  activePage.value = 'product';
}

function applySelectedProduct(data: { productId: string; product?: InventoryTransferProductSummary }) {
  if (!data?.productId) return;
  const productChanged = Boolean(productId.value && productId.value !== data.productId);
  productId.value = data.productId;
  selectedProduct.value = data.product || { productId: data.productId };
  if (productChanged) clearOrderItem();
  activePage.value = 'form';
}

function selectOrderItem() {
  activePage.value = 'order-item';
}

function applySelectedOrderItem(orderItem: InventoryTransferOrderItemSummary) {
  if (!orderItem) return;
  selectedOrderItem.value = orderItem;
  orderId.value = orderItem.orderId;
  orderItemSeqId.value = orderItem.orderItemSeqId;
  if (orderItem.facilityId) facilityIdTo.value = orderItem.facilityId;
  productId.value = orderItem.productId;
  selectedProduct.value = {
    productId: orderItem.productId,
    productName: orderItem.productName,
    internalName: orderItem.internalName,
    sku: orderItem.sku,
    upc: orderItem.upc,
    goodIdentifications: orderItem.goodIdentifications,
    mainImageUrl: orderItem.mainImageUrl,
  };
  activePage.value = 'form';
}

function clearOrderItem() {
  selectedOrderItem.value = null;
  orderId.value = '';
  orderItemSeqId.value = '';
}

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
