<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button :aria-label="translate(embedded ? 'Back' : 'Close')" @click="closePage">
          <ion-icon slot="icon-only" :icon="embedded ? arrowBackOutline : closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ selectedStyle ? translate('Select a product') : translate('Search products') }}</ion-title>
      <ion-buttons v-if="selectedStyle" slot="end">
        <ion-button @click="backToStyles">{{ translate('Back') }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
    <ion-toolbar v-if="!selectedStyle">
      <ion-searchbar
        :value="keyword"
        :debounce="300"
        :placeholder="translate('Search styles, SKUs or barcodes')"
        @ionInput="updateKeyword"
      />
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <template v-if="!selectedStyle">
      <ion-list v-if="styles.length" lines="full">
        <ion-item v-for="style in styles" :key="style.productId" button detail @click="openStyle(style)">
          <ion-thumbnail slot="start"><Image :src="style.mainImageUrl" /></ion-thumbnail>
          <ion-label class="ion-text-wrap">
            {{ style.productName || style.internalName || style.productId }}
            <p>{{ style.sku || style.productId }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <div v-else-if="isLoading" class="modal-state"><ion-spinner name="crescent" /></div>
      <p v-else class="modal-state">
        {{ keyword ? translate('No styles found') : translate('Search for a style to see its products') }}
      </p>
    </template>

    <template v-else>
      <ion-item lines="full">
        <ion-thumbnail slot="start"><Image :src="selectedStyle.mainImageUrl" /></ion-thumbnail>
        <ion-label class="ion-text-wrap">{{ selectedStyle.productName || selectedStyle.productId }}</ion-label>
      </ion-item>
      <ion-radio-group v-if="variants.length" :value="selectedProductId">
        <ion-list lines="full">
          <ion-item
            v-for="variant in variants"
            :key="variant.productId"
            button
            :detail="false"
            @click="selectVariant(variant)"
          >
            <ion-radio
              slot="start"
              :value="variant.productId"
              :aria-label="variant.productName || variant.sku || variant.productId"
            />
            <ion-thumbnail slot="start"><Image :src="variant.mainImageUrl" /></ion-thumbnail>
            <ion-label class="ion-text-wrap">
              {{ variant.productName || variant.internalName || variant.productId }}
              <p>{{ variant.sku || variant.productId }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-radio-group>
      <div v-else-if="isLoading" class="modal-state"><ion-spinner name="crescent" /></div>
      <p v-else class="modal-state">{{ translate('No products found') }}</p>
    </template>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button v-if="!selectionMode" fill="clear" @click="clearFilter">{{ translate('Clear filter') }}</ion-button>
        <ion-button
          fill="solid"
          :disabled="!selectedProductId"
          data-testid="apply-product-filter"
          @click="applyFilter"
        >
          {{ translate(selectionMode ? 'Select' : 'Apply') }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonRadio, IonRadioGroup, IonSearchbar, IonSpinner, IonThumbnail, IonTitle, IonToolbar, modalController,
} from '@ionic/vue';
import { arrowBackOutline, closeOutline } from 'ionicons/icons';
import { onMounted, ref } from 'vue';
import { translate } from '@common';
import Image from '@/components/Image.vue';
import {
  type InventoryTransferProductSummary,
  useInventoryTransferProductSearch,
} from '@/composables/useInventoryTransferProductSearch';

const props = defineProps<{ embedded?: boolean; selectedProductId?: string; selectionMode?: boolean }>();
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', selection: { productId: string; product: InventoryTransferProductSummary | null }): void;
}>();
const embedded = props.embedded === true;
const selectionMode = props.selectionMode === true;
const { searchStyles, fetchVariants } = useInventoryTransferProductSearch();
const keyword = ref('');
const styles = ref<InventoryTransferProductSummary[]>([]);
const variants = ref<InventoryTransferProductSummary[]>([]);
const selectedStyle = ref<InventoryTransferProductSummary | null>(null);
const selectedProductId = ref(props.selectedProductId || '');
const selectedProduct = ref<InventoryTransferProductSummary | null>(null);
const isLoading = ref(false);
let requestId = 0;

onMounted(loadStyles);

async function loadStyles() {
  const currentRequest = ++requestId;
  isLoading.value = true;
  const result = await searchStyles(keyword.value);
  if (currentRequest !== requestId) return;
  styles.value = result.styles;
  isLoading.value = false;
}

async function updateKeyword(event: CustomEvent<{ value?: string | null }>) {
  keyword.value = event.detail.value || '';
  await loadStyles();
}

async function openStyle(style: InventoryTransferProductSummary) {
  const currentRequest = ++requestId;
  selectedStyle.value = style;
  variants.value = [];
  isLoading.value = true;
  const result = await fetchVariants(style.productId);
  if (currentRequest !== requestId) return;
  variants.value = result.variants;
  selectedProduct.value = variants.value.find((variant) => variant.productId === selectedProductId.value) || null;
  isLoading.value = false;
}

function backToStyles() {
  requestId += 1;
  selectedStyle.value = null;
  variants.value = [];
  isLoading.value = false;
}

function selectVariant(product: InventoryTransferProductSummary) {
  selectedProductId.value = product.productId;
  selectedProduct.value = product;
}

function applyFilter() {
  const selection = { productId: selectedProductId.value, product: selectedProduct.value };
  if (embedded) emit('select', selection);
  else modalController.dismiss(selection, 'confirm');
}

function clearFilter() {
  modalController.dismiss({ productId: '' }, 'confirm');
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
</style>
