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
            <ion-item lines="none" :disabled="selectedTab === 'TransferOrderMisshipped'">
              <ion-select data-testid="discrepancies-origin-select" :label="translate('Origin')" interface="popover" v-model="originFacilityId">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
                  {{ facility.facilityName || facility.facilityId }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none" :disabled="selectedTab === 'TransferOrderMisshipped'">
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
          <ion-infinite-scroll data-testid="discrepancies-infinite-scroll" @ionInfinite="loadMoreDiscrepancies($event)" threshold="100px" v-if="isScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </main>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/vue';
import { checkmarkCircleOutline, downloadOutline, filterOutline, sendOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, hasError } from '@/adapter';
import logger from '@/logger';
import { formatUtcDate } from '@/utils';
import Image from "@/components/Image.vue";
import DiscrepancyFilters from "@/components/DiscrepancyFilters.vue";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";
import { useOrderStore } from "@/store/order";

const selectedTab = ref('TransferOrderOverReceived');
const originFacilityId = ref('');
const destinationFacilityId = ref('');
const discrepancies = ref<any[]>([]);
const isLoading = ref(false);
const isScrollable = ref(true);
const router = useRouter();
const productIdentificationStore = useProductIdentificationStore();
const productStore = useProductStore();
const utilStore = useUtilStore();
const orderStore = useOrderStore();

const getProduct = computed(() => productStore.getProduct);
const facilities = computed(() => utilStore.getFacilitiesByProductStore);

const fetchDiscrepancies = async (vSize?: any, vIndex?: any) => {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  const parsedViewSize = parseInt(viewSize as string) || 20;

  if (viewIndex === 0) {
    isLoading.value = true;
    discrepancies.value = [];
    isScrollable.value = false;
  }
  try {
    const payload = {} as any;

    payload.viewSize = viewSize;
    payload.viewIndex = viewIndex;
    if (selectedTab.value !== 'TransferOrderMisshipped') {
      payload.varianceQuantity_op = selectedTab.value === 'TransferOrderOverReceived' ? 'greater' : 'less';
    }

    if (originFacilityId.value) {
      payload.originFacilityId = originFacilityId.value;
    }

    if (destinationFacilityId.value) {
      payload.destinationFacilityId = destinationFacilityId.value;
    }

    const resp = selectedTab.value === 'TransferOrderMisshipped' ? await orderStore.fetchMisShippedItems(payload) : await orderStore.fetchDiscrepancies(payload);

    if (resp && resp.data) {
      const respData = selectedTab.value === 'TransferOrderMisshipped' ? resp.data.misShippedItems : resp.data.discrepancies;
      if (respData && respData.length > 0) {
        if (viewIndex === 0) {
          discrepancies.value = respData;
        } else {
          discrepancies.value = discrepancies.value.concat(respData);
        }
        isScrollable.value = respData.length >= parsedViewSize;
      } else {
        if (viewIndex === 0) discrepancies.value = [];
        isScrollable.value = false;
      }
    } else {
      if (viewIndex === 0) discrepancies.value = [];
      isScrollable.value = false;
    }

    if (discrepancies.value.length) {
      const productIds = discrepancies.value.map((item: any) => item.productId).filter((id: any, index: number, self: any) => id && self.indexOf(id) === index);
      if (productIds.length) {
        await productStore.fetchProducts({ productIds });
      }
    }
  } catch (error) {
    logger.error('Error fetching discrepancies', error);
  } finally {
    isLoading.value = false;
  }
};

const loadMoreDiscrepancies = async (event: any) => {
  const viewSize = parseInt(process.env.VUE_APP_VIEW_SIZE as string) || 20;
  const viewIndex = Math.ceil(discrepancies.value.length / viewSize);
  await fetchDiscrepancies(viewSize, viewIndex).then(() => {
    event.target.complete();
  });
};

// TODO: Need to re-visit. On calling this, on resetting the filters to empty the fetchDiscrepancies was called multiple times when directly called in the watch.
const updateFiltersAndFetch = () => {
  if (selectedTab.value === 'TransferOrderMisshipped' && (originFacilityId.value || destinationFacilityId.value)) {
    originFacilityId.value = '';
    destinationFacilityId.value = '';
    return;
  }
  fetchDiscrepancies();
};

onIonViewWillEnter(() => updateFiltersAndFetch());

// TODO: Need to re-visit.
watch([selectedTab, originFacilityId, destinationFacilityId], () => updateFiltersAndFetch());

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
