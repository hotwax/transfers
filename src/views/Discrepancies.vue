<template>
  <ion-page>
    <DiscrepancyFilters 
      menu-id="discrepancy-filter" 
      content-id="discrepancy-filter-content"
      v-model:selectedTab="selectedTab"
      v-model:originFacilityId="originFacilityId"
      v-model:destinationFacilityId="destinationFacilityId"
      :facilities="facilities"
    />

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Discrepancies") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="discrepancy-filter" class="mobile-only">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="discrepancy-filter-content">
      <div class="find">
        <aside class="filters">
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h1>{{ translate("Type") }}</h1>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-select data-testid="discrepancies-type-select" :label="translate('Discrepancy Type')" interface="popover" v-model="selectedTab">
                <ion-select-option value="TransferOrderOverReceived">{{ translate("Over") }}</ion-select-option>
                <ion-select-option value="TransferOrderUnderReceived">{{ translate("Under") }}</ion-select-option>
                <ion-select-option value="TransferOrderMisshipped">{{ translate("Mis-shipped") }}</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-label>
                <h1>{{ translate("Location") }}</h1>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-select data-testid="discrepancies-origin-select" :label="translate('Origin')" interface="popover" v-model="originFacilityId">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
                  {{ facility.facilityName || facility.facilityId }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select data-testid="discrepancies-destination-select" :label="translate('Destination')" interface="popover" v-model="destinationFacilityId">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
                  {{ facility.facilityName || facility.facilityId }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </aside>

        <main class="ion-content-scroll-host">
          <div v-if="isLoading" data-testid="discrepancies-loading" class="empty-state">
            <ion-spinner name="crescent" />
            <p>{{ translate("Fetching discrepancies...") }}</p>
          </div>
          <div v-else-if="!discrepancies.length" class="empty-state">
            <ion-icon :icon="checkmarkCircleOutline" color="success" />
            <p>{{ translate("No discrepancies found for this category.") }}</p>
          </div>
          <div v-else>
            <div class="list-item" :data-testid="`discrepancy-row-${item.orderId}`" v-for="(item, index) in discrepancies" :key="index" @click="viewOrder(item.orderId)">
              <ion-item lines="none">
                <ion-label>
                  {{ item.orderName || item.orderId }}
                  <p>{{ item.orderId }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <Image :src="getProduct(item.productId)?.mainImageUrl" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName || item.productId }}
                  <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
              </ion-item>
              <ion-chip outline>
                <ion-icon :icon="sendOutline" />
                <ion-label>{{ item.originFacilityName || getFacilityName(item.originFacilityId) }}</ion-label>
              </ion-chip>
              <ion-chip outline>
                <ion-icon :icon="downloadOutline" />
                <ion-label>{{ item.destinationFacilityName || getFacilityName(item.destinationFacilityId || item.facilityId) }}</ion-label>
              </ion-chip>
              <ion-label>
                {{ formatDate(item.orderDate || item.datetimeReceived) }}
              </ion-label>
              <ion-label class="ion-text-end">
                <ion-badge :color="selectedTab === 'TransferOrderUnderReceived' ? 'danger' : 'warning'">
                  {{ item.varianceQuantity || item.quantityAccepted }}
                </ion-badge>
              </ion-label>
            </div>
          </div>
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { checkmarkCircleOutline, downloadOutline, filterOutline, sendOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, hasError } from '@/adapter';
import logger from '@/logger';
import { formatUtcDate } from '@/utils';
import { useStore } from 'vuex';
import Image from "@/components/Image.vue";
import DiscrepancyFilters from "@/components/DiscrepancyFilters.vue";

const selectedTab = ref('TransferOrderOverReceived');
const originFacilityId = ref('');
const destinationFacilityId = ref('');
const discrepancies = ref<any[]>([]);
const isLoading = ref(false);
const store = useStore();
const router = useRouter();
const productIdentificationStore = useProductIdentificationStore();

const getProduct = computed(() => store.getters["product/getProduct"]);
const facilities = computed(() => store.getters["util/getFacilitiesByProductStore"]);

const fetchDiscrepancies = async () => {
  isLoading.value = true;
  discrepancies.value = [];
  try {
    // Dummy Data for demonstration with real IDs
    const mockData: any = {
      'TransferOrderOverReceived': [
        { orderId: 'M111589', orderName: 'Transfer to Store 101', orderDate: 1739817600000, productId: '10001', originFacilityId: 'WH_MAIN', originFacilityName: 'Main Warehouse', destinationFacilityId: 'STORE_101', destinationFacilityName: 'Fashion Store 101', varianceQuantity: 2 },
        { orderId: 'M111630', orderName: 'Transfer to Store 102', orderDate: 1739821200000, productId: '10005', originFacilityId: 'WH_MAIN', originFacilityName: 'Main Warehouse', destinationFacilityId: 'STORE_102', destinationFacilityName: 'Fashion Store 102', varianceQuantity: 1 }
      ],
      'TransferOrderUnderReceived': [
        { orderId: 'M111610', orderName: 'Warehouse Replenishment', orderDate: 1739904000000, productId: '10002', originFacilityId: 'STORE_101', originFacilityName: 'Fashion Store 101', destinationFacilityId: 'WH_MAIN', destinationFacilityName: 'Main Warehouse', varianceQuantity: -5 },
        { orderId: 'M111612', orderName: 'Store 105 Restock', orderDate: 1739910000000, productId: '10009', originFacilityId: 'WH_MAIN', originFacilityName: 'Main Warehouse', destinationFacilityId: 'STORE_105', destinationFacilityName: 'Fashion Store 105', varianceQuantity: -12 }
      ],
      'TransferOrderMisshipped': [
        { orderId: 'M111591', orderName: 'Ad-hoc Transfer', orderDate: 1740000000000, productId: '10100', originFacilityId: 'STORE_101', originFacilityName: 'Fashion Store 101', destinationFacilityId: 'STORE_202', destinationFacilityName: 'Outlet 202', facilityId: 'STORE_202', quantityAccepted: 1, datetimeReceived: 1740086400000 }
      ]
    };

    // Filter by Discrepancy Type
    let data = mockData[selectedTab.value] || [];

    // Filter by Origin Facility
    if (originFacilityId.value) {
      data = data.filter((item: any) => item.originFacilityId === originFacilityId.value);
    }

    // Filter by Destination Facility
    if (destinationFacilityId.value) {
      data = data.filter((item: any) => (item.destinationFacilityId || item.facilityId) === destinationFacilityId.value);
    }

    discrepancies.value = data;
    
    /* 
    // Real API call (commented out for dummy mode)
    const payload = {
      "dataDocumentId": selectedTab.value,
      "pageIndex": 0,
      "pageSize": 100
    };
    
    const resp = await api({
      url: "oms/dataDocumentView",
      method: "post",
      data: payload
    });

    if (resp && !hasError(resp)) {
      discrepancies.value = resp.data.entityValueList || [];
    }
    */

    if (discrepancies.value.length) {
      const productIds = discrepancies.value.map((item: any) => item.productId).filter((id: any, index: number, self: any) => id && self.indexOf(id) === index);
      if (productIds.length) {
        await store.dispatch('product/fetchProducts', { productIds });
      }
    }
  } catch (error) {
    logger.error('Error fetching discrepancies', error);
  } finally {
    isLoading.value = false;
  }
};

onIonViewWillEnter(fetchDiscrepancies);

watch([selectedTab, originFacilityId, destinationFacilityId], fetchDiscrepancies);

const formatDate = (date: any) => {
  if (!date) return '-';
  return formatUtcDate(date, 'dd MMM yyyy');
};

const getFacilityName = (facilityId: string) => {
  const facility = facilities.value?.find((facility: any) => facility.facilityId === facilityId);
  return facility ? facility.facilityName || facility.facilityId : facilityId;
};

const viewOrder = (orderId: string) => {
  if (orderId) {
    router.push(`/order-detail/${orderId}`);
  }
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacer-lg);
  height: 50vh;
}

.empty-state ion-icon {
  font-size: 72px;
  margin-bottom: var(--spacer-md);
}

.empty-state p {
  color: var(--ion-color-medium);
  max-width: 400px;
}

.list-item {
  --columns-desktop: 6;
  --columns-tablet: 6;
  gap: var(--spacer-sm);
  border-bottom: var(--border-medium);
  padding-inline-end: var(--spacer-sm);
  transition: background-color .3s ease;
  cursor: pointer;
}


.list-item ion-item {
  width: 100%;
}

main > div{
  cursor: pointer;
}

.find {
  height: 100%;
  grid-template-rows: auto auto 1fr;
}

.find main {
  height: 100%;
  overflow-y: auto;
  padding-bottom: var(--spacer-lg);
}

.filters h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

@media (min-width: 991px) {
  .find {
    margin: 0;
    height: 100%;
    grid-template-rows: auto 1fr;
    display: grid;
    grid-template-columns: 350px 1fr;
    grid-template-areas: "aside main";
  }

  .find .filters {
    grid-area: aside;
    border-right: var(--border-medium);
    margin-inline-start: var(--spacer-xl);
    padding-block-start: var(--spacer-xl);
  }

  .find main {
    grid-area: main;
    height: 100%;
    overflow-y: scroll;
    padding-inline-start: var(--spacer-xl);
    padding-block-start: var(--spacer-xl);
  }

  .list-item {
    padding-inline-end: var(--spacer-xl);
  }
}
</style>
