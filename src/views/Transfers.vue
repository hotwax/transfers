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

    <ion-content id="filter-content">
      <div class="find">
        <section class="search">
          <ion-searchbar :placeholder="translate('Search transfer orders')" v-model="orderName" @keyup.enter="orderName = $event.target.value; updateAppliedFilters($event.target.value, 'orderName')" />
        </section>

        <aside class="filters">
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h1>{{ translate("Location") }}</h1>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Product Store')" interface="popover" :value="query.productStoreId" @ionChange="updateAppliedFilters($event['detail'].value, 'productStoreId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="store in productStores" :key="store.productStoreId" :value="store.productStoreId">{{ store.storeName ? store.storeName : store.productStoreId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Origin')" interface="popover" :value="query.facilityId" @ionChange="updateAppliedFilters($event['detail'].value, 'facilityId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName ? facility.facilityName : facility.facilityId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Destination')" interface="popover" :value="query.orderFacilityId" @ionChange="updateAppliedFilters($event['detail'].value, 'orderFacilityId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName ? facility.facilityName : facility.facilityId }}</ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item lines="none">
              <ion-label>
                <h1>{{ translate("Fulfillment") }}</h1>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Method')" interface="popover" :value="query.shipmentMethodTypeId" @ionChange="updateAppliedFilters($event['detail'].value, 'shipmentMethodTypeId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="(shipmentMethodTypeDesc, shipmentMethodTypeId) in shipmentMethods" :key="shipmentMethodTypeId" :value="shipmentMethodTypeId">{{ shipmentMethodTypeDesc ? shipmentMethodTypeDesc : shipmentMethodTypeId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Carrier')" interface="popover" :value="query.carrierPartyId" @ionChange="updateAppliedFilters($event['detail'].value, 'carrierPartyId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="(carrierDesc, carrierPartyId) in carriersList" :key="carrierPartyId" :value="carrierPartyId">{{ carrierDesc ? carrierDesc : carrierPartyId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Status')" interface="popover" :value="query.orderStatusId" @ionChange="updateAppliedFilters($event['detail'].value, 'orderStatusId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="statusId in orderStatusIds" :key="statusId" :value="statusId">{{ getStatusDesc(statusId) }}</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </aside>

        <main>
          <section class="sort">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="documentTextOutline" />
              <ion-select :label="translate('Group by')" interface="popover" :value="selectedGroupBy.id" @ionChange="updateGroupByFilter($event.detail.value)">
                <ion-select-option v-for="option in groupByOptions" :value="option.id" :key="option.id">{{ option.description }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none" button @click="updateAppliedFilters('', 'sort')">
              <ion-icon slot="start" :icon="swapVerticalOutline" />
              <ion-label>{{ translate("Sort by") }}</ion-label>
              <ion-label>{{ translate("Created date") }}</ion-label>
              <ion-icon slot="end" :icon="arrowUpOutline" :class="query.sort === 'orderDate asc' ? 'sort-icon rotate' : 'sort-icon'" />
            </ion-item>
          </section>

          <hr />

          <div class="empty-state" v-if="isFetchingOrders">
            <ion-spinner name="crescent" />
            <p>{{ translate("Loading") }}</p>
          </div>
          <div class="empty-state" v-else-if="!ordersList?.length">
            <p>{{ translate("No order found") }}</p>
          </div>
          <ion-accordion-group v-else :multiple="true" @ionChange="showOrderItems($event)">
            <template v-for="(order, index) in ordersList" :key="index">
              <ion-accordion :value="order.groupValue">
                <!-- Different accordion headers and content based on groupBy value on orderId -->
                <template v-if="query.groupBy === 'ORDER_ID'">
                  <!-- order header -->
                  <div class="section-header" slot="header" color="light">
                    <ion-item class="primary-info" lines="none">
                      <ion-label>
                        <strong>{{ order.orderName }}</strong>
                        <p>{{ order.orderId }}</p>
                      </ion-label>
                    </ion-item>
                    <div class="tags">
                      <ion-chip outline>
                        <ion-icon :icon="sendOutline" />
                        <ion-label>{{ order.facilityId }}</ion-label>
                      </ion-chip>
                      <ion-chip outline>
                        <ion-icon :icon="downloadOutline" />
                        <ion-label>{{ order.orderFacilityId }}</ion-label>
                      </ion-chip>
                    </div>
                    <div class="metadata">
                      <ion-note>{{ translate("Created on") }} {{ formatUtcDate(order.orderDate, "dd LLL yyyy") }}</ion-note>
                      <ion-badge :color="getColorByDesc(order.orderStatusDesc) || getColorByDesc('default')">
                        {{ order.orderStatusDesc }}
                      </ion-badge>
                    </div>
                    <div class="toggle-icon ion-padding">
                      <ion-icon :icon="chevronDownOutline" class="ion-accordion-toggle-icon" />
                    </div>
                  </div>
                  <div class="ion-padding" slot="content">
                    <!-- items loader -->
                    <div v-if="!orderItemsList(order.orderId)?.length" class="empty-state">
                      <ion-spinner name="crescent" />
                      <p>{{ translate("Loading") }}</p>
                    </div>
                    <!-- order items -->
                    <div v-else class="list-item" v-for="(item, index) in orderItemsList(order.orderId)" :key="index" @click="router.push(`/order-detail/${order.orderId}`)">
                      <ion-item lines="none">
                        <ion-thumbnail slot="start">
                          <Image :src="getProduct(item.productId)?.mainImageUrl" />
                        </ion-thumbnail>
                        <ion-label class="ion-text-wrap">
                          {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                          <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                        </ion-label>
                      </ion-item>
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
                      <ion-item lines="none">
                        <ion-badge slot="end" :color="getColorByDesc(item.orderItemStatusDesc) || getColorByDesc('default')">{{ getStatusDesc(item.itemStatusId) }}</ion-badge>
                      </ion-item>
                    </div>
                  </div>
                </template>

                <!-- Different accordion header and content based on groupBy value on origin and destination facility -->
                <template  v-else-if="query.groupBy === 'ORIGIN' || query.groupBy === 'DESTINATION'">
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
                    <div v-else class="list-item" v-for="(item, index) in orderItemsList(query.groupBy === 'ORIGIN' ? order.facilityId : order.orderFacilityId)" :key="index" @click="router.push(`/order-detail/${item.orderId}`)">
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
                        <ion-badge slot="end" :color="getColorByDesc(getStatusDesc(item.itemStatusId)) || getColorByDesc('default')">{{ getStatusDesc(item.itemStatusId) }}</ion-badge>
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
                        <ion-badge slot="end" :color="getColorByDesc(getStatusDesc(item.itemStatusId)) || getColorByDesc('default')">{{ getStatusDesc(item.itemStatusId) }}</ion-badge>
                      </div>
                    </div>
                  </div>
                </template>
              </ion-accordion>
            </template>
          </ion-accordion-group>

          <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" v-if="isScrollable">
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
import { IonAccordion, IonAccordionGroup, IonBadge, IonButtons, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonMenuButton, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { addOutline, arrowUpOutline, chevronDownOutline, documentTextOutline, downloadOutline, filterOutline, sendOutline, swapVerticalOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import router from '@/router';
import Image from '@/components/Image.vue';
import Filters from "@/components/Filters.vue";
import logger from '@/logger';
import { useStore } from 'vuex';
import { computed, ref } from "vue";
import { hasError } from "@/adapter";
import { formatUtcDate, getColorByDesc } from "@/utils"
import { UtilService } from '@/services/UtilService';

const productIdentificationStore = useProductIdentificationStore();
const store = useStore();
const ecomStores = useUserStore()

const groupByOptions = [
  {
    id: "ORDER_ID",
    description: translate("Order item"),
    selectFields: ["orderId", "orderName", "facilityId", "orderFacilityId", "orderStatusDesc"],
    groupingFields: ["orderId"],
    groupValueSeparator: '-' 
  },
  {
    id: "DESTINATION",
    description: translate("Destination"),
    selectFields: ["orderFacilityId"],
    groupingFields: ["orderFacilityId"],
    groupValueSeparator: '-' 
  },
  {
    id: "DESTINATION_PRODUCT",
    description: translate("Destination and product"),
    selectFields: ["productId", "orderFacilityId"],
    groupingFields: ["productId", "orderFacilityId"],
    groupValueSeparator: '-' 
  },
  {
    id: "ORIGIN",
    description: translate("Origin"),
    selectFields: ["facilityId"],
    groupingFields: ["facilityId"],
    groupValueSeparator: '-' 
  },
  {
    id: "ORIGIN_PRODUCT",
    description: translate("Origin and product"),
    selectFields: ["productId", "facilityId"],
    groupingFields: ["productId", "facilityId"],
    groupValueSeparator: '-' 
  }
]

const selectedGroupBy = ref(groupByOptions[0])

const orderName = ref("");
const isFetchingOrders = ref(false);
const productStores = ref({}) as any;
const facilities = ref([]) as any;
const orderStatusIds = ["ORDER_APPROVED", "ORDER_CANCELLED", "ORDER_COMPLETED", "ORDER_CREATED"];

const query = computed(() => store.getters["order/getQuery"])
const getProduct = computed(() => store.getters["product/getProduct"])
const ordersList = computed(() => store.getters["order/getOrders"])
const orderItemsList = computed(() => store.getters["order/getItemsByGroupId"])
const getStatusDesc = computed(() => store.getters["util/getStatusDesc"])
const shipmentMethods = computed(() => store.getters["util/getShipmentMethods"])
const carriersList = computed(() => store.getters["util/getCarriers"])
const isScrollable = computed(() => store.getters["order/isScrollable"])

onIonViewWillEnter(async () => {
  await store.dispatch("order/updateOrdersList", { orders: [], ordersCount: 0 })
  isFetchingOrders.value = true;
  await Promise.allSettled([store.dispatch('order/findTransferOrders', { pageSize: 20, pageIndex: 0, groupByConfig: selectedGroupBy.value }), store.dispatch('util/fetchStatusDesc'), store.dispatch("util/fetchCarriersDetail"), store.dispatch("util/fetchShipmentMethodTypeDesc")])
  await fetchFacilities();
  productStores.value = await ecomStores.getEComStores();
  isFetchingOrders.value = false;
})

async function fetchFacilities() {
  let pageIndex = 0, resp
  try {
    do {
      resp = await UtilService.fetchFacilities({
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y",
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        pageSize: 100,
        pageIndex
      });

      if (!hasError(resp)) {
        if (resp.data.length) {
          facilities.value = facilities.value.concat(resp.data);
        }
      } else {
        throw resp.data;
      }
      pageIndex++;
    } while (resp.data.length >= 100);
  } catch (error) {
    logger.error(error);
  }
}

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
  const facility = facilities.value.find((facility: any) => facility.facilityId === facilityId)
  return facility ? facility.facilityName || facility.facilityId : facilityId
}
</script>

<style scoped>
.sort {
  margin: var(--spacer-sm) 0;
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

.section-header {
  display: grid;
  grid-template-areas: "info metadata toggle-icon"
                       "tags tags tags";
  align-items: center;                     
  margin: 0 var(--spacer-sm);
}

.primary-info {
  grid-area: info;
}

.tags {
  grid-area: tags;
  justify-self: center;
}

.list-item {
  --columns-tablet: 4;
  --columns-desktop: 6;
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

@media (min-width: 991px) {
  ion-content {
    --padding-bottom: 80px;
  }

  .section-header {
    grid: "info tags metadata toggle-icon" / 1fr auto 1fr min-content;
  }

  .tablet {
    display: unset;
  }

  .find {
    margin-right: 0;
  }

  .info {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(314px, max-content));
    align-items: start;
    grid-area: cards;
  }

  .sort {
    display: flex;
    justify-content: end;
  }

  .sort  > ion-item {
    flex: 0 1 343px;
    border-left: var(--border-medium);
  }
}
</style>