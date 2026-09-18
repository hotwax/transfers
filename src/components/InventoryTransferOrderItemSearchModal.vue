<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button :aria-label="translate(embedded ? 'Back' : 'Close')" @click="closePage">
          <ion-icon slot="icon-only" :icon="embedded ? arrowBackOutline : closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Select sales order item') }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar
        :value="keyword"
        :debounce="300"
        :placeholder="translate('Search orders, products or identifiers')"
        @ionInput="updateKeyword"
      />
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="items.length" lines="full">
      <ion-item-group v-for="group in groupedItems" :key="group.facilityId">
        <ion-item-divider>
          <ion-label>{{ group.facilityName }}</ion-label>
        </ion-item-divider>
        <ion-item
          v-for="item in group.items"
          :key="`${item.orderId}-${item.orderItemSeqId}-${item.facilityId}`"
          button
          :detail="false"
          @click="selectOrderItem(item)"
        >
          <ion-thumbnail slot="start">
            <Image :src="item.mainImageUrl" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <p class="order-name">{{ item.orderName || item.orderId }}</p>
            <h2>{{ primaryIdentifier(item) }}</h2>
            <p v-if="secondaryIdentifier(item)">{{ secondaryIdentifier(item) }}</p>
          </ion-label>
          <ion-note slot="end">{{ translate('Qty') }} {{ item.quantity }}</ion-note>
        </ion-item>
      </ion-item-group>
    </ion-list>
    <div v-else-if="isLoading" class="modal-state">
      <ion-spinner name="crescent" />
    </div>
    <p v-else class="modal-state">
      {{ keyword ? translate('No order items found') : translate('Search for an order or product') }}
    </p>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonItemGroup,
  IonLabel, IonList, IonNote, IonSearchbar, IonSpinner, IonThumbnail, IonTitle, IonToolbar,
  modalController,
} from '@ionic/vue';
import { arrowBackOutline, closeOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { commonUtil, translate } from '@common';
import Image from '@/components/Image.vue';
import {
  type InventoryTransferOrderItemSummary,
  useInventoryTransferOrderItemSearch,
} from '@/composables/useInventoryTransferOrderItemSearch';
import { useProductStore } from '@/store/productStore';

const { searchOrderItems } = useInventoryTransferOrderItemSearch();
const props = defineProps<{ embedded?: boolean }>();
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', orderItem: InventoryTransferOrderItemSummary): void;
}>();
const embedded = props.embedded === true;
const productStore = useProductStore();
const keyword = ref('');
const items = ref<InventoryTransferOrderItemSummary[]>([]);
const isLoading = ref(false);
let requestId = 0;

const groupedItems = computed(() => {
  const groups = new Map<string, { facilityId: string; facilityName: string; items: InventoryTransferOrderItemSummary[] }>();
  items.value.forEach((item) => {
    const facilityId = item.facilityId || 'UNKNOWN';
    if (!groups.has(facilityId)) {
      const facility = productStore.getAllFacilities.find((candidate: any) => candidate.facilityId === item.facilityId);
      groups.set(facilityId, {
        facilityId,
        facilityName: facility?.facilityName || item.facilityId || translate('Location unavailable'),
        items: [],
      });
    }
    groups.get(facilityId)?.items.push(item);
  });
  return [...groups.values()];
});

async function updateKeyword(event: CustomEvent<{ value?: string | null }>) {
  keyword.value = event.detail.value || '';
  const currentRequest = ++requestId;
  if (!keyword.value.trim()) {
    items.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  const result = await searchOrderItems(keyword.value);
  if (currentRequest !== requestId) return;
  items.value = result.items;
  isLoading.value = false;
}

function primaryIdentifier(item: InventoryTransferOrderItemSummary) {
  const identifierType = productStore.getProductIdentificationPref.primaryId || 'SKU';
  return commonUtil.getProductIdentificationValue(identifierType, item)
    || item.sku
    || item.productId;
}

function secondaryIdentifier(item: InventoryTransferOrderItemSummary) {
  const identifierType = productStore.getProductIdentificationPref.secondaryId || 'UPCA';
  const identifier = commonUtil.getProductIdentificationValue(identifierType, item)
    || commonUtil.getProductIdentificationValue('UPCA', item);
  return identifier === primaryIdentifier(item) ? '' : identifier;
}

function selectOrderItem(orderItem: InventoryTransferOrderItemSummary) {
  if (embedded) emit('select', orderItem);
  else modalController.dismiss({ orderItem }, 'confirm');
}

function closePage() {
  if (embedded) emit('close');
  else modalController.dismiss();
}
</script>

<style scoped>
.modal-state {
  display: flex;
  justify-content: center;
  padding: var(--spacer-lg);
}

.order-name {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
}
</style>
