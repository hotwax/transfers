<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate('Inventory transfers') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :scroll-y="false">
      <div class="find">
        <aside class="filters">
          <ion-list lines="none">
            <ion-list-header>{{ translate('Filters') }}</ion-list-header>
            <ion-item><ion-input v-model="filters.inventoryTransferId" :label="translate('Transfer ID')" label-placement="stacked" /></ion-item>
            <ion-item button detail="false" @click="selectOrder">
              <ion-label><p>{{ translate('Order ID') }}</p>{{ filters.orderId || translate('Select order') }}</ion-label>
              <ion-button v-if="filters.orderId" slot="end" fill="clear" @click.stop="setFilter('orderId', '')">{{ translate('Clear') }}</ion-button>
            </ion-item>
            <ion-item><ion-input v-model="filters.orderItemSeqId" :label="translate('Order item sequence ID')" label-placement="stacked" /></ion-item>
            <ion-item><ion-input v-model="filters.productId" :label="translate('Product ID')" label-placement="stacked" /></ion-item>
            <ion-item>
              <ion-select v-model="filters.facilityId" :label="translate('Source facility')" label-placement="stacked" interface="popover">
                <ion-select-option value="">{{ translate('All') }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName || facility.facilityId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select v-model="filters.facilityIdTo" :label="translate('Destination facility')" label-placement="stacked" interface="popover">
                <ion-select-option value="">{{ translate('All') }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName || facility.facilityId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select v-model="filters.statusId" :label="translate('Status')" label-placement="stacked" interface="popover">
                <ion-select-option value="">{{ translate('All') }}</ion-select-option>
                <ion-select-option v-for="status in statuses" :key="status.id" :value="status.id">{{ translate(status.label) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-button expand="block" @click="loadTransfers">{{ translate('Apply filters') }}</ion-button>
            <ion-button expand="block" fill="clear" @click="resetFilters">{{ translate('Reset') }}</ion-button>
          </ion-list>
        </aside>

        <main class="ion-content-scroll-host">
          <div v-if="transferStore.isFetching" class="empty-state"><ion-spinner name="crescent" /><p>{{ translate('Fetching inventory transfers') }}</p></div>
          <div v-else-if="!transfers.length" class="empty-state"><ion-icon :icon="swapHorizontalOutline" color="medium" /><h1>{{ translate('No inventory transfers found') }}</h1></div>
          <template v-else>
            <div class="list-item inventory-transfer" v-for="transfer in transfers" :key="transfer.inventoryTransferId">
              <ion-item lines="none">
                <ion-label>{{ productName(transfer.productId) }}<p>{{ transfer.productId }} · {{ transfer.inventoryTransferId }}</p></ion-label>
              </ion-item>
              <ion-label class="quantity">{{ transfer.quantity }}<p>{{ translate('Quantity') }}</p></ion-label>
              <ion-label>{{ facilityName(transfer.facilityId) }}<p>{{ translate('Source') }}</p></ion-label>
              <ion-label>{{ facilityName(transfer.facilityIdTo) }}<p>{{ translate('Destination') }}</p></ion-label>
              <ion-label>
                <template v-if="transfer.orderId">{{ transfer.orderId }}<p>{{ transfer.orderItemSeqId || translate('Order') }}</p></template>
                <template v-else>—<p>{{ translate('Order') }}</p></template>
              </ion-label>
              <div class="metadata">
                <ion-note>{{ createdTime(transfer.createdStamp) }}</ion-note>
                <ion-badge :color="statusColor(transfer.statusId)">{{ statusLabel(transfer.statusId) }}</ion-badge>
              </div>
              <ion-buttons v-if="canManage && transfer.statusId === 'IXF_REQUESTED'">
                <ion-button fill="clear" @click.stop="executeInventoryTransfer(transfer.inventoryTransferId)">{{ translate('Execute') }}</ion-button>
                <ion-button fill="clear" color="danger" @click.stop="cancelInventoryTransfer(transfer.inventoryTransferId)">{{ translate('Cancel') }}</ion-button>
              </ion-buttons>
            </div>
          </template>
          <ion-infinite-scroll :disabled="!transferStore.hasMore" threshold="100px" @ionInfinite="loadMore($event)">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </main>
      </div>
      <ion-fab v-if="canManage" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :aria-label="translate('Create inventory transfer')" @click="createInventoryTransfer">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge, IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList,
  IonListHeader, IonNote, IonPage, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar,
  alertController, modalController, onIonViewWillEnter,
} from '@ionic/vue';
import { addOutline, swapHorizontalOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { DateTime } from 'luxon';
import { commonUtil, translate } from '@common';
import InventoryTransferModal from '@/components/InventoryTransferModal.vue';
import InventoryTransferOrderLookupModal from '@/components/InventoryTransferOrderLookupModal.vue';
import { useInventoryTransferStore, type InventoryTransferFilters } from '@/store/inventoryTransfer';
import { useProductStore } from '@/store/productStore';
import { useProductStore as useProduct } from '@/store/product';
import { useUserStore } from '@/store/user';
import Actions from '@/authorization/actions';

const transferStore = useInventoryTransferStore();
const productStore = useProductStore();
const productCache = useProduct();
const userStore = useUserStore();
const transfers = computed(() => transferStore.transfers);
const filters = computed(() => transferStore.filters);
const facilities = computed(() => productStore.getAllFacilities);
const canManage = computed(() => userStore.hasPermission(Actions.APP_INVENTORY_TRANSFER_MANAGE));
const statuses = [
  { id: 'IXF_REQUESTED', label: 'Requested' },
  { id: 'IXF_COMPLETE', label: 'Complete' },
  { id: 'IXF_CANCELLED', label: 'Cancelled' },
];

onIonViewWillEnter(async () => {
  await Promise.all([productStore.fetchAllFacilities(), loadTransfers()]);
});

function setFilter(field: keyof InventoryTransferFilters, value: string) {
  transferStore.setFilter(field, value);
}

async function cacheProducts() {
  const productIds = [...new Set(transfers.value.map((transfer) => transfer.productId).filter(Boolean))] as string[];
  if (productIds.length) await productCache.fetchProducts({ productIds });
}

async function loadTransfers() {
  await transferStore.fetchInventoryTransfers();
  await cacheProducts();
}

async function loadMore(event: any) {
  await transferStore.fetchInventoryTransfers({
    pageIndex: Math.ceil(transfers.value.length / 20), pageSize: 20, append: true,
  });
  await cacheProducts();
  await event.target.complete();
}

async function resetFilters() {
  transferStore.resetFilters();
  await loadTransfers();
}

async function selectOrder() {
  const modal = await modalController.create({ component: InventoryTransferOrderLookupModal });
  await modal.present();
  const { data, role } = await modal.onWillDismiss();
  if (role === 'confirm' && data?.orderId) {
    setFilter('orderId', data.orderId);
    await loadTransfers();
  }
}

async function createInventoryTransfer() {
  const modal = await modalController.create({ component: InventoryTransferModal });
  await modal.present();
  const { role } = await modal.onWillDismiss();
  if (role === 'confirm') {
    commonUtil.showToast(translate('Inventory transfer created.'), { position: 'top' });
    await loadTransfers();
  }
}

async function confirmAction(header: string, message: string) {
  const alert = await alertController.create({
    header: translate(header), message: translate(message),
    buttons: [{ text: translate('Cancel'), role: 'cancel' }, { text: translate('Confirm'), role: 'confirm' }],
  });
  await alert.present();
  const result = await alert.onWillDismiss();
  return result.role === 'confirm';
}

async function executeInventoryTransfer(inventoryTransferId: string) {
  if (!await confirmAction('Execute inventory transfer', 'This will adjust inventory at both facilities. Continue?')) return;
  await transferStore.executeInventoryTransfer(inventoryTransferId);
  commonUtil.showToast(translate('Inventory transfer executed.'), { position: 'top' });
  await loadTransfers();
}

async function cancelInventoryTransfer(inventoryTransferId: string) {
  if (!await confirmAction('Cancel inventory transfer', 'This requested transfer will be cancelled. Continue?')) return;
  await transferStore.cancelInventoryTransfer(inventoryTransferId);
  commonUtil.showToast(translate('Inventory transfer cancelled.'), { position: 'top' });
  await loadTransfers();
}

function facilityName(facilityId: string) {
  return facilities.value.find((facility: any) => facility.facilityId === facilityId)?.facilityName || facilityId;
}

function productName(productId: string) {
  const product = productCache.getProduct(productId);
  return product?.parentProductName || product?.productName || product?.internalName || productId;
}

function createdTime(value: any) {
  if (!value) return '';
  const date = typeof value === 'number' ? DateTime.fromMillis(value) : DateTime.fromISO(String(value));
  return date.isValid ? date.toFormat('dd LLL yyyy t') : String(value);
}

function statusLabel(statusId: string) {
  return translate(statuses.find((status) => status.id === statusId)?.label || statusId);
}

function statusColor(statusId: string) {
  if (statusId === 'IXF_COMPLETE') return 'success';
  if (statusId === 'IXF_CANCELLED') return 'medium';
  return 'warning';
}
</script>

<style scoped>
.find { height: 100%; grid-template-rows: auto 1fr; }
.filters { overflow-y: auto; }
main { height: 100%; overflow-y: auto; padding-bottom: 5rem; }
.empty-state { display: flex; min-height: 16rem; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-state ion-icon { font-size: 72px; }
.inventory-transfer { --columns-tablet: 7; --columns-desktop: 7; grid-template-columns: minmax(12rem, 2fr) .5fr 1fr 1fr 1fr 1fr auto; border-bottom: var(--border-medium); padding-inline-end: var(--spacer-sm); }
.metadata { text-align: end; }
.metadata ion-note { display: block; }
.quantity { text-align: center; }
@media (max-width: 990px) {
  .find { display: block; overflow-y: auto; }
  .filters { overflow: visible; }
  main { overflow: visible; }
  .inventory-transfer { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacer-sm); padding: var(--spacer-sm); }
  .inventory-transfer > ion-item, .inventory-transfer > ion-buttons { grid-column: 1 / -1; }
}
</style>
