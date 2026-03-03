<template>
  <ion-page>
    <Filters menu-id="transfers-filter" content-id="filter-content"/>

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Transfer orders") }}</ion-title>
        <ion-buttons slot="end">
          <!-- Todo: add support for downloading orders. -->
          <!-- <ion-button>
            <ion-icon :icon="downloadOutline" slot="icon-only" />
          </ion-button> -->
          <ion-menu-button menu="transfers-filter" class="mobile-only">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter-content" :scroll-y="false">
      <div class="find">
          <section class="search">
          <ion-searchbar data-testid="transfers-search-input" :placeholder="translate('Search transfer orders')" v-model="orderName" @keyup.enter="orderName = $event.target.value; updateAppliedFilters($event.target.value, 'orderName')" />
        </section>

        <aside class="filters">
          <TransferFiltersContent />
        </aside>

        <main class="ion-content-scroll-host">
          <section class="sort">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="documentTextOutline" />
              <ion-select data-testid="transfers-groupby-select" :label="translate('Group by')" interface="popover" :value="selectedGroupBy.id" @ionChange="updateGroupByFilter($event.detail.value)">
                <ion-select-option v-for="option in groupByOptions" :value="option.id" :key="option.id">{{ option.description }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item data-testid="transfers-sort-btn" lines="none" button @click="updateAppliedFilters('', 'sort')">
              <ion-icon slot="start" :icon="swapVerticalOutline" />
              <ion-label>{{ translate("Sort by") }}</ion-label>
              <ion-label slot="end">{{ translate("Created date") }}</ion-label>
              <ion-icon slot="end" :icon="arrowUpOutline" :class="query.sort === 'orderDate asc' ? 'sort-icon rotate' : 'sort-icon'" />
            </ion-item>
          </section>

          <hr />

          <div class="empty-state" data-testid="transfers-loading" v-if="isFetchingOrders">
            <ion-spinner name="crescent" />
            <p>{{ translate("Fetching transfer orders") }}</p>
          </div>
          <div class="empty-state" data-testid="transfers-empty" v-else-if="!ordersList?.length">
            <template v-if="isAnyFilterApplied">
              <p>{{ translate("No transfer orders found for the applied filters.") }}</p>
            </template>
            <template v-else>
              <ion-icon :icon="sendOutline" color="medium" />
              <h1>{{ translate("No transfer orders found") }}</h1>
              <p>{{ translate("No transfer orders were found in the system. Create a new transfer order to get started.") }}</p>
              <ion-button fill="outline" @click="router.push('/create-order')">
                {{ translate("Create transfer order") }}
              </ion-button>
            </template>
          </div>
          <template v-if="query.groupBy === 'ORDER_ID'">
            <div class="list-item order" :data-testid="`orders-row-${order.orderId}`" v-for="(order, index) in ordersList" :key="index" @click="router.push(`/order-detail/${order.orderId}`)">
              <ion-item lines="none">
                <ion-label>
                  {{ order.orderName }}
                  <p>{{ order.orderId }}</p>
                </ion-label>
              </ion-item>
              <div>
                <ion-chip outline>
                  <ion-icon :icon="sendOutline" />
                  <ion-label>{{ order.facilityName ?? order.facilityId }}</ion-label>
                </ion-chip>
                <ion-chip outline>
                  <ion-icon :icon="downloadOutline" />
                  <ion-label>{{ order.orderFacilityName ?? order.orderFacilityId }}</ion-label>
                </ion-chip>
              </div>
              <div class="metadata">
                <ion-note>{{ translate("Created on") }} {{ formatUtcDate(order.orderDate, "dd LLL yyyy") }}</ion-note>
                <ion-badge :color="(STATUSCOLOR as any)[order.orderStatusId] || 'medium'">
                  {{ order.orderStatusDesc }}
                </ion-badge>
              </div>
            </div>
          </template>
          <ion-accordion-group v-else :multiple="true" @ionChange="showOrderItems($event)">
            <template v-for="(order, index) in ordersList" :key="index">
              <ion-accordion :value="order.groupValue">
                <!-- Different accordion header and content based on groupBy value on origin and destination facility -->
                <template  v-if="query.groupBy === 'ORIGIN' || query.groupBy === 'DESTINATION'">
                  <!-- order header -->
                  <div class="list-item" slot="header" color="light">
                    <ion-item lines="none">
                      <ion-icon slot="start" :icon="query.groupBy === 'ORIGIN' ? sendOutline : downloadOutline" />
                      <ion-label>
                        {{ query.groupBy === 'ORIGIN' ? getFacilityName(order.facilityId) : getFacilityName(order.orderFacilityId) }}
                        <p>{{ query.groupBy === 'ORIGIN' ? order.facilityId : order.orderFacilityId }}</p>
                      </ion-label>
                    </ion-item>
                    <!-- TODO: Currently the api is not returning these values -->
                    <div class="tablet ion-text-center">
                      <ion-label>
                        {{ order.totalOrdered || '-' }}
                        <p>{{ translate("ordered") }}</p>
                      </ion-label>
                    </div>
                    <div class="tablet ion-text-center">
                      <ion-label>
                        {{ order.totalShipped || '-' }}
                        <p>{{ translate("shipped") }}</p>
                      </ion-label>
                    </div>
                    <div class="tablet ion-text-center">
                      <ion-label>
                        {{ order.totalReceived || '-' }}
                        <p>{{ translate("received") }}</p>
                      </ion-label>
                    </div>
                    <div class="ion-padding-end">
                      <ion-icon :icon="chevronDownOutline" class="ion-accordion-toggle-icon" />
                    </div>
                  </div>
                  <div class="ion-padding" slot="content">
                    <!-- items loader -->
                    <div v-if="!orderItemsList(query.groupBy === 'ORIGIN' ? order.facilityId : order.orderFacilityId)?.length" class="empty-state">
                      <ion-spinner name="crescent" />
                      <p>{{ translate("Loading") }}</p>
                    </div>
                    <!-- order items -->
                    <div v-else class="list-item" :data-testid="`orders-row-${item.orderId}`" v-for="(item, index) in orderItemsList(query.groupBy === 'ORIGIN' ? order.facilityId : order.orderFacilityId)" :key="index" @click="router.push(`/order-detail/${item.orderId}`)">
                      <ion-item lines="none">
                        <ion-label class="ion-text-wrap">
                          {{ item.orderName }}
                          <p>{{ item.orderId }}</p>
                        </ion-label>
                      </ion-item>
                      <ion-chip outline>
                        <ion-icon :icon="query.groupBy === 'ORIGIN' ? downloadOutline : sendOutline" />
                        <ion-label>{{ query.groupBy === "ORIGIN" ? item.facilityName : item.orderFacilityName }}</ion-label>
                      </ion-chip>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ item.quantity || 0 }}
                          <p>{{ translate("ordered") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ item.shippedQty || 0 }}
                          <p>{{ translate("shipped") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ item.receivedQty || 0 }}
                          <p>{{ translate("received") }}</p>
                        </ion-label>
                      </div>
                      <div class="metadata ion-padding-end">
                        <ion-note>{{ translate("Created on") }} {{ formatUtcDate(item.orderDate, "dd LLL yyyy") }}</ion-note>
                        <ion-badge slot="end" :color="(STATUSCOLOR as any)[item.itemStatusId] || 'medium'">{{ getStatusDesc(item.itemStatusId) }}</ion-badge>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Different accordion header and content based on groupBy value on origin and destination facility with product -->
                <template v-else>
                  <!-- order header -->
                  <div class="list-item" slot="header">
                    <ion-item lines="none">
                      <ion-thumbnail slot="start">
                        <Image :src="getProduct(order.productId)?.mainImageUrl" />
                      </ion-thumbnail>
                      <ion-label>
                        {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(order.productId)) || getProduct(order.productId).productName }}
                        <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(order.productId)) }}</p>
                      </ion-label>
                    </ion-item>
                    <ion-chip outline>
                      <ion-icon :icon="query.groupBy === 'ORIGIN_PRODUCT' ? sendOutline : downloadOutline" />
                      <ion-label>{{ query.groupBy === "ORIGIN_PRODUCT" ? getFacilityName(order.facilityId) : getFacilityName(order.orderFacilityId) }}</ion-label>
                    </ion-chip>
                    <div class="tablet ion-text-center">
                      <ion-label>
                        {{ order.totalOrdered || '-' }}
                        <p>{{ translate("ordered") }}</p>
                      </ion-label>
                    </div>
                    <div class="tablet ion-text-center">
                      <ion-label>
                        {{ order.totalShipped || '-' }}
                        <p>{{ translate("shipped") }}</p>
                      </ion-label>
                    </div>
                    <div class="tablet ion-text-center">
                      <ion-label>
                        {{ order.totalReceived || '-' }}
                        <p>{{ translate("received") }}</p>
                      </ion-label>
                    </div>
                    <div class="ion-padding-end tablet">
                      <ion-icon :icon="chevronDownOutline" class="ion-accordion-toggle-icon" />
                    </div>
                  </div>
                  <div class="ion-padding" slot="content">
                    <!-- items loader -->
                    <div v-if="!orderItemsList(query.groupBy === 'ORIGIN_PRODUCT' ? `${order.productId}-${order.facilityId}` : `${order.productId}-${order.orderFacilityId}`)?.length" class="empty-state">
                      <ion-spinner name="crescent" />
                      <p>{{ translate("Loading") }}</p>
                    </div>
                    <!-- order items -->
                    <div class="list-item" v-for="(item, index) in orderItemsList(query.groupBy === 'ORIGIN_PRODUCT' ? `${order.productId}-${order.facilityId}` : `${order.productId}-${order.orderFacilityId}`)" :key="index" @click="router.push(`/order-detail/${item.orderId}`)">
                      <ion-item lines="none">
                        <ion-label class="ion-text-wrap">
                          {{ item.orderName }}
                          <p>{{ item.orderId }}</p>
                        </ion-label>
                      </ion-item>
                      <ion-chip outline>
                        <ion-icon :icon="query.groupBy === 'ORIGIN_PRODUCT' ? downloadOutline : sendOutline" />
                        <ion-label>{{ query.groupBy === "ORIGIN_PRODUCT" ? item.facilityName : item.orderFacilityName }}</ion-label>
                      </ion-chip>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ item.quantity || 0 }}
                          <p>{{ translate("ordered") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ item.shippedQty || 0 }}
                          <p>{{ translate("shipped") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ item.receivedQty || 0 }}
                          <p>{{ translate("received") }}</p>
                        </ion-label>
                      </div>
                      <div class="metadata ion-padding-end">
                        <ion-note>{{ translate("Created on") }} {{ formatUtcDate(item.orderDate, "dd LLL yyyy") }}</ion-note>
                        <ion-badge slot="end" :color="(STATUSCOLOR as any)[item.itemStatusId] || 'medium'">{{ getStatusDesc(item.itemStatusId) }}</ion-badge>
                      </div>
                    </div>
                  </div>
                </template>
              </ion-accordion>
            </template>
          </ion-accordion-group>

          <ion-infinite-scroll data-testid="transfers-infinite-scroll" @ionInfinite="loadMoreOrders($event)" threshold="100px" v-if="isScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
          </ion-infinite-scroll>
        </main>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="router.push('/create-order')">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAccordion, IonAccordionGroup, IonBadge, IonButton, IonButtons, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { addOutline, arrowUpOutline, chevronDownOutline, documentTextOutline, downloadOutline, filterOutline, sendOutline, swapVerticalOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import router from '@/router';
import Image from '@/components/Image.vue';
import Filters from "@/components/Filters.vue";
import TransferFiltersContent from "@/components/TransferFiltersContent.vue";
import logger from '@/logger';
import { useStore } from 'vuex';
import { computed, ref } from "vue";
import { STATUSCOLOR } from "@/adapter";
import { formatUtcDate } from "@/utils"

const productIdentificationStore = useProductIdentificationStore();
const store = useStore();
const userStore = useUserStore()

const groupByOptions = [
  {
    id: "ORDER_ID",
    description: translate("Order item"),
    selectFields: ["orderId", "orderName", "facilityId", "facilityName", "orderFacilityId", "orderFacilityName", "orderStatusDesc, orderStatusId"],
    groupingFields: ["orderId"],
    groupValueSeparator: '-' 
  },
  {
    id: "DESTINATION",
    description: translate("Destination"),
    selectFields: ["orderFacilityId", "orderFacilityName"],
    groupingFields: ["orderFacilityId"],
    groupValueSeparator: '-' 
  },
  {
    id: "DESTINATION_PRODUCT",
    description: translate("Destination and product"),
    selectFields: ["productId", "orderFacilityId", "orderFacilityName"],
    groupingFields: ["productId", "orderFacilityId"],
    groupValueSeparator: '-' 
  },
  {
    id: "ORIGIN",
    description: translate("Origin"),
    selectFields: ["facilityId", "facilityName"],
    groupingFields: ["facilityId"],
    groupValueSeparator: '-' 
  },
  {
    id: "ORIGIN_PRODUCT",
    description: translate("Origin and product"),
    selectFields: ["productId", "facilityId", "facilityName"],
    groupingFields: ["productId", "facilityId"],
    groupValueSeparator: '-' 
  }
]

const selectedGroupBy = ref(groupByOptions[0])

const orderName = ref("");
const isFetchingOrders = ref(false);
const query = computed(() => store.getters["order/getQuery"])
const getProduct = computed(() => store.getters["product/getProduct"])
const ordersList = computed(() => store.getters["order/getOrders"])
const orderItemsList = computed(() => store.getters["order/getItemsByGroupId"])
const getStatusDesc = computed(() => store.getters["util/getStatusDesc"])
const isScrollable = computed(() => store.getters["order/isScrollable"])

const isAnyFilterApplied = computed(() => {
  const { orderName, productStoreId, facilityId, orderFacilityId, orderStatusId, carrierPartyId, shipmentMethodTypeId, statusFlowId } = query.value;
  return !!(orderName || productStoreId || facilityId || orderFacilityId || orderStatusId || carrierPartyId || shipmentMethodTypeId || statusFlowId);
})

onIonViewWillEnter(async () => {
  await store.dispatch("order/updateOrdersList", { orders: [], ordersCount: 0 })
  isFetchingOrders.value = true;
  await Promise.allSettled([store.dispatch('order/findTransferOrders', { pageSize: process.env.VUE_APP_VIEW_SIZE, pageIndex: 0, groupByConfig: selectedGroupBy.value }), store.dispatch('util/fetchStatusDesc'), store.dispatch("util/fetchCarriersDetail"), store.dispatch("util/fetchShipmentMethodTypeDesc")])
  isFetchingOrders.value = false;
})

function updateGroupByFilter(groupById: string) {
  const option = groupByOptions.find(value => value.id === groupById)
  if(option) {
    selectedGroupBy.value = option
    updateAppliedFilters(groupById, "groupBy" , option)
  }
}

async function updateAppliedFilters(value: string | boolean, filterName: string, groupByConfig = selectedGroupBy.value ) {
  isFetchingOrders.value = true
  if(filterName === "sort") value = query.value.sort === 'orderDate desc' ? 'orderDate asc' : 'orderDate desc'
  await store.dispatch('order/updateOrdersList', { orders: [], ordersCount: 0 })
  await store.dispatch('order/updateAppliedFilters', { value, filterName, groupByConfig })
  isFetchingOrders.value = false
}

async function loadMoreOrders(event: any) {
  await store.dispatch('order/findTransferOrders', {
    pageSize: 20,
    pageIndex: Math.ceil(ordersList.value.length / 20).toString(),
    groupByConfig: selectedGroupBy.value
  }).then(async () => {
    await event.target.complete();
  })
}

async function showOrderItems($event: any) {
  const groupValues = $event.detail.value;
  // Only fetch items when an accordion is opened, not closed
  if(!groupValues) return

  const newlySelectedGroupValue = groupValues.filter((value: string) => value && !store.state.order.orderItemsList[value])
  if(!newlySelectedGroupValue.length) return

  const groupValue = newlySelectedGroupValue[0];
  await store.dispatch('order/findTransferOrderItems', { groupValue, groupByConfig: selectedGroupBy.value })  
}

function getFacilityName(facilityId: string) {
  const facility = store.getters["util/getFacilitiesByProductStore"]?.find((facility: any) => facility.facilityId === facilityId)
  return facility ? facility.facilityName || facility.facilityId : facilityId
}
</script>

<style scoped>
.sort {
  margin: var(--spacer-sm) 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacer-lg);
}

.empty-state ion-icon {
  font-size: 72px;
  margin-bottom: var(--spacer-md);
}

.empty-state h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.empty-state p {
  color: var(--ion-color-medium);
  max-width: 400px;
  margin-bottom: var(--spacer-lg);
}

.metadata {
  text-align: end;
}

.metadata > ion-note {
  display: block;
}

main > div{
  cursor: pointer;
}

.list-item {
  --columns-tablet: 4;
  --columns-desktop: 6;
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

.rotate {
  transform: rotate(180deg);
}

.sort-icon {
  /* Used the same transition property as used in ion-select arrow icon */
  transition: transform .15s cubic-bezier(.4, 0, .2, 1);
}

/* Added width property as after updating to ionic7 min-width is getting applied on ion-label inside ion-item
which results in distorted label text and thus reduced ion-item width */
.list-item > ion-item {
  width: 100%;
}

ion-accordion {
  border-bottom: var(--border-medium);
}

.order {
  --columns-desktop: 3;
  --columns-tablet:3;
}

.order {
  border-bottom: var(--border-medium);
  transition: background-color .3s ease;
}

.order ion-item {
  --background: transparent;
}

.order .metadata {
  margin-inline-end: var(--spacer-sm);
}

@media (min-width: 991px) {
  .tablet {
    display: unset;
  }

  .find {
    margin: 0;
    height: 100%;
    grid-template-rows: auto 1fr;
  }

  .find .search, .find .filters {
    margin-inline-start: var(--spacer-xl);
  }

  .find .search, .find main {
    padding-block-start: var(--spacer-xl);
  }

  .find main {
    height: 100%;
    overflow-y: scroll;
  }

  .sort {
    display: flex;
    justify-content: end;
  }

  .sort  > ion-item {
    flex: 0 1 343px;
    border-left: var(--border-medium);
  }

  .order {
    grid-template-columns: 1fr auto 1fr;
  }
}
</style>