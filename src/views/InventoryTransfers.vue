<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate('Inventory transfers') }}</ion-title>
        <ion-buttons v-if="canManage && selectableTransfers.length" slot="end">
          <ion-button @click="toggleSelectMode">
            {{ selectMode ? translate('Done') : translate('Select') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false">
      <div class="find">
        <aside class="filters">
          <ion-list lines="none">
            <ion-list-header>{{ translate('Reference') }}</ion-list-header>
            <ion-item>
              <ion-input
                :value="filters.inventoryTransferId"
                :label="translate('Transfer ID')"
                @ionChange="updateFilter('inventoryTransferId', $event.detail.value || '')"
              />
            </ion-item>
            <ion-item button detail="false" @click="selectOrder">
              <ion-label>
                <p>{{ translate('Sales order') }}</p>
                {{ filters.orderId || translate('Select order') }}
              </ion-label>
              <ion-button v-if="filters.orderId" slot="end" fill="clear" @click.stop="updateFilter('orderId', '')">
                {{ translate('Clear') }}
              </ion-button>
            </ion-item>
            <ion-item button detail="false" @click="selectProduct">
              <ion-label>
                <p>{{ translate('Product') }}</p>
                {{ selectedProductLabel }}
              </ion-label>
              <ion-button v-if="filters.productId" slot="end" fill="clear" @click.stop="updateFilter('productId', '')">
                {{ translate('Clear') }}
              </ion-button>
            </ion-item>

            <ion-list-header>{{ translate('Location') }}</ion-list-header>
            <ion-item>
              <ion-select
                data-testid="inventory-transfer-filter-source"
                :label="translate('Source')"
                interface="popover"
                :value="filters.facilityId"
                @ionChange="updateFilter('facilityId', $event.detail.value)"
              >
                <ion-select-option value="">{{ translate('All') }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
                  {{ facility.facilityName || facility.facilityId }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select
                data-testid="inventory-transfer-filter-destination"
                :label="translate('Destination')"
                interface="popover"
                :value="filters.facilityIdTo"
                @ionChange="updateFilter('facilityIdTo', $event.detail.value)"
              >
                <ion-select-option value="">{{ translate('All') }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
                  {{ facility.facilityName || facility.facilityId }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-list-header>{{ translate('Status') }}</ion-list-header>
            <ion-item>
              <ion-select
                data-testid="inventory-transfer-filter-status"
                :label="translate('Status')"
                interface="popover"
                :value="filters.statusId"
                @ionChange="updateFilter('statusId', $event.detail.value)"
              >
                <ion-select-option value="">{{ translate('All') }}</ion-select-option>
                <ion-select-option v-for="status in statuses" :key="status.id" :value="status.id">
                  {{ translate(status.label) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-button expand="block" fill="clear" @click="resetFilters">{{ translate('Reset') }}</ion-button>
          </ion-list>

          <ion-list v-if="selectMode" class="bulk-actions" lines="none">
            <ion-list-header>{{ translate('Bulk actions') }}</ion-list-header>
            <ion-item button detail="false" @click="toggleAllRequested">
              <ion-checkbox
                slot="start"
                :checked="allSelectableSelected"
                :indeterminate="someSelectableSelected && !allSelectableSelected"
                :aria-label="translate('Select all requested transfers')"
                @click.stop
                @ionChange="setAllRequested($event.detail.checked)"
              />
              <ion-label>
                {{ translate('Select all requested') }}
                <p>{{ selectedTransferIds.length }} {{ translate('selected') }}</p>
              </ion-label>
            </ion-item>
            <ion-button expand="block" :disabled="!selectedTransferIds.length" @click="executeSelectedInventoryTransfers">
              {{ translate('Execute selected') }}
            </ion-button>
            <ion-button expand="block" fill="outline" color="danger" :disabled="!selectedTransferIds.length" @click="cancelSelectedInventoryTransfers">
              {{ translate('Cancel selected') }}
            </ion-button>
          </ion-list>
        </aside>

        <main class="ion-content-scroll-host">
          <div v-if="transferStore.isFetching" class="empty-state">
            <ion-spinner name="crescent" />
            <p>{{ translate('Fetching inventory transfers') }}</p>
          </div>
          <div v-else-if="!transfers.length" class="empty-state">
            <ion-icon :icon="swapHorizontalOutline" color="medium" />
            <h1>{{ translate('No inventory transfers found') }}</h1>
          </div>
          <template v-else>
            <InventoryTransferRow
              v-for="transfer in transfers"
              :key="transfer.inventoryTransferId"
              :transfer="transfer"
              :image-url="product(transfer.productId).mainImageUrl || ''"
              :primary-identifier="primaryIdentifier(transfer.productId)"
              :source-facility-name="facilityName(transfer.facilityId)"
              :destination-facility-name="facilityName(transfer.facilityIdTo)"
              :order-name="orderNames[transfer.orderId] || transfer.orderId || ''"
              :created-time="createdTime(transfer.createdStamp)"
              :status-label="statusLabel(transfer.statusId)"
              :status-color="statusColor(transfer.statusId)"
              :can-manage="canManage"
              :select-mode="selectMode"
              :selected="selectedTransferIds.includes(transfer.inventoryTransferId)"
              @selection-change="updateSelection(transfer.inventoryTransferId, $event)"
              @execute="executeInventoryTransfer(transfer.inventoryTransferId)"
              @cancel="cancelInventoryTransfer(transfer.inventoryTransferId)"
            />
          </template>
          <ion-infinite-scroll :disabled="!transferStore.hasMore" threshold="100px" @ionInfinite="loadMore($event)">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </main>
      </div>

      <ion-fab v-if="canManage && !selectMode" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :aria-label="translate('Create inventory transfer')" @click="createInventoryTransfer">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList,
  IonListHeader, IonPage, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar,
  alertController, modalController, onIonViewWillEnter,
} from '@ionic/vue';
import { addOutline, swapHorizontalOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { DateTime } from 'luxon';
import { commonUtil, logger, translate } from '@common';
import InventoryTransferModal from '@/components/InventoryTransferModal.vue';
import InventoryTransferOrderLookupModal from '@/components/InventoryTransferOrderLookupModal.vue';
import InventoryTransferProductSearchModal from '@/components/InventoryTransferProductSearchModal.vue';
import InventoryTransferRow from '@/components/InventoryTransferRow.vue';
import { fetchInventoryTransferOrderNames } from '@/services/inventoryTransferEnrichment';
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
const selectMode = ref(false);
const selectedTransferIds = ref<string[]>([]);
const orderNames = ref<Record<string, string>>({});
const statuses = [
  { id: 'IXF_REQUESTED', label: 'Requested' },
  { id: 'IXF_COMPLETE', label: 'Complete' },
  { id: 'IXF_CANCELLED', label: 'Cancelled' },
];
const selectableTransfers = computed(() => transfers.value.filter((transfer) => transfer.statusId === 'IXF_REQUESTED'));
const allSelectableSelected = computed(() => selectableTransfers.value.length > 0
  && selectableTransfers.value.every((transfer) => selectedTransferIds.value.includes(transfer.inventoryTransferId)));
const someSelectableSelected = computed(() => selectableTransfers.value.some(
  (transfer) => selectedTransferIds.value.includes(transfer.inventoryTransferId),
));
const selectedProductLabel = computed(() => {
  if (!filters.value.productId) return translate('Select product');
  return primaryIdentifier(filters.value.productId) || translate('Selected product');
});

onIonViewWillEnter(async () => {
  await Promise.all([productStore.fetchAllFacilities(), loadTransfers()]);
});

function setFilter(field: keyof InventoryTransferFilters, value: string) {
  transferStore.setFilter(field, value);
}

async function updateFilter(field: keyof InventoryTransferFilters, value: string) {
  setFilter(field, value || '');
  selectedTransferIds.value = [];
  await loadTransfers();
}

async function enrichTransfers(transferRows: any[]) {
  const productIds = [...new Set(transferRows.map((transfer) => transfer.productId).filter(Boolean))] as string[];
  const missingOrderIds = [...new Set(transferRows
    .map((transfer) => transfer.orderId)
    .filter((orderId) => orderId && !orderNames.value[orderId]))] as string[];

  const enrichments: Promise<any>[] = [];
  if (productIds.length) enrichments.push(productCache.fetchProducts({ productIds }));
  if (missingOrderIds.length) {
    enrichments.push(fetchInventoryTransferOrderNames(missingOrderIds)
      .then((names) => { orderNames.value = { ...orderNames.value, ...names }; })
      .catch((error) => logger.error('Failed to enrich inventory transfer orders', error)));
  }
  await Promise.allSettled(enrichments);
}

async function loadTransfers() {
  const rows = await transferStore.fetchInventoryTransfers();
  await enrichTransfers(rows);
}

async function loadMore(event: any) {
  const rows = await transferStore.fetchInventoryTransfers({
    pageIndex: Math.ceil(transfers.value.length / 20), pageSize: 20, append: true,
  });
  await enrichTransfers(rows);
  await event.target.complete();
}

async function resetFilters() {
  transferStore.resetFilters();
  selectedTransferIds.value = [];
  await loadTransfers();
}

async function selectOrder() {
  const modal = await modalController.create({ component: InventoryTransferOrderLookupModal });
  await modal.present();
  const { data, role } = await modal.onWillDismiss();
  if (role === 'confirm' && data?.orderId) {
    setFilter('orderId', data.orderId);
    selectedTransferIds.value = [];
    await loadTransfers();
  }
}

async function selectProduct() {
  const modal = await modalController.create({
    component: InventoryTransferProductSearchModal,
    componentProps: { selectedProductId: filters.value.productId },
  });
  await modal.present();
  const { data, role } = await modal.onWillDismiss();
  if (role !== 'confirm') return;
  if (data?.product) productCache.addProductToCached(data.product);
  await updateFilter('productId', data?.productId || '');
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) selectedTransferIds.value = [];
}

function updateSelection(inventoryTransferId: string, selected: boolean) {
  selectedTransferIds.value = selected
    ? [...new Set([...selectedTransferIds.value, inventoryTransferId])]
    : selectedTransferIds.value.filter((id) => id !== inventoryTransferId);
}

function setAllRequested(selected: boolean) {
  selectedTransferIds.value = selected
    ? selectableTransfers.value.map((transfer) => transfer.inventoryTransferId)
    : [];
}

function toggleAllRequested() {
  setAllRequested(!allSelectableSelected.value);
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
    header: translate(header),
    message: translate(message),
    buttons: [
      { text: translate('Cancel'), role: 'cancel' },
      { text: translate('Confirm'), role: 'confirm' },
    ],
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
}

async function executeSelectedInventoryTransfers() {
  if (!selectedTransferIds.value.length) return;
  if (!await confirmAction('Execute selected transfers', 'This will adjust inventory at both facilities. Continue?')) return;
  const summary = await transferStore.executeInventoryTransfers(selectedTransferIds.value);
  showBulkResult(summary, 'executed');
  selectedTransferIds.value = summary.failed;
  if (!summary.failed.length) selectMode.value = false;
  await loadTransfers();
}

async function cancelSelectedInventoryTransfers() {
  if (!selectedTransferIds.value.length) return;
  if (!await confirmAction('Cancel selected transfers', 'The selected requested transfers will be cancelled. Continue?')) return;
  const summary = await transferStore.cancelInventoryTransfers(selectedTransferIds.value);
  showBulkResult(summary, 'cancelled');
  selectedTransferIds.value = summary.failed;
  if (!summary.failed.length) selectMode.value = false;
}

function showBulkResult(summary: { succeeded: string[]; failed: string[] }, action: string) {
  const failureMessage = summary.failed.length ? ` ${summary.failed.length} ${translate('failed.')}` : '';
  commonUtil.showToast(`${summary.succeeded.length} ${translate(`transfers ${action}.`)}${failureMessage}`, { position: 'top' });
}

function facilityName(facilityId: string) {
  return facilities.value.find((facility: any) => facility.facilityId === facilityId)?.facilityName || facilityId;
}

function product(productId: string) {
  return productCache.getProduct(productId) || {};
}

function primaryIdentifier(productId: string) {
  const details = product(productId);
  return commonUtil.getProductIdentificationValue(productStore.getProductIdentificationPref.primaryId, details)
    || details.sku
    || details.parentProductName
    || details.productName
    || translate('Product information unavailable');
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
.find {
  height: 100%;
  grid-template-rows: auto 1fr;
}

.filters,
main {
  overflow-y: auto;
}

main {
  height: 100%;
  padding-bottom: var(--spacer-2xl);
}

.bulk-actions {
  margin-top: var(--spacer-sm);
  padding-bottom: var(--spacer-sm);
}

.bulk-actions > ion-button {
  margin-inline: var(--spacer-sm);
}

.empty-state {
  min-height: 16rem;
  text-align: center;
}

@media (max-width: 990px) {
  .find {
    display: block;
    overflow-y: auto;
  }

  .filters,
  main {
    overflow: visible;
  }
}
</style>
