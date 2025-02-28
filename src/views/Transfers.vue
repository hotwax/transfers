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

    <ion-content id="filter-content" ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <div class="find">
        <section class="search">
          <ion-searchbar :placeholder="translate('Search transfer orders')" v-model="queryString" @keyup.enter="queryString = $event.target.value; updateAppliedFilters($event.target.value, 'queryString')" />
        </section>

        <aside class="filters">
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h1>{{ translate("Location") }}</h1>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Product Store')" interface="popover" :value="query.productStore" @ionChange="updateAppliedFilters($event['detail'].value, 'productStore')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="store in productStoreOptions" :key="store" :value="store">{{ store }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Origin')" interface="popover" :value="query.originFacility" @ionChange="updateAppliedFilters($event['detail'].value, 'originFacility')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in originFacilityOptions" :key="facility" :value="facility">{{ facility }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Destination')" interface="popover" :value="query.destinationFacility" @ionChange="updateAppliedFilters($event['detail'].value, 'destinationFacility')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="facility in destinationFacilityOptions" :key="facility" :value="facility">{{ facility }}</ion-select-option>
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
                <ion-select-option v-for="method in shipmentMethodOptions" :key="method" :value="method">{{ getShipmentMethodDesc(method) ? getShipmentMethodDesc(method) : method }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Carrier')" interface="popover" :value="query.carrierPartyId" @ionChange="updateAppliedFilters($event['detail'].value, 'carrierPartyId')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="carrier in carrierOptions" :key="carrier" :value="carrier">{{ getCarrierDesc(carrier) ? getCarrierDesc(carrier) : carrier }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Status')" interface="popover" :value="query.status" @ionChange="updateAppliedFilters($event['detail'].value, 'status')">
                <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                <ion-select-option v-for="status in orderStatuses" :key="status" :value="status">{{ status }}</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </aside>

        <main>
          <section class="sort">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="documentTextOutline" />
              <ion-select :label="translate('Group by')" interface="popover" :value="query.groupBy" @ionChange="updateAppliedFilters($event['detail'].value, 'groupBy')">
                <ion-select-option value="orderId">{{ translate("Order item") }}</ion-select-option>
                <ion-select-option value="orderFacilityName">{{ translate("Destination") }}</ion-select-option>
                <ion-select-option value="destinationFacilityProductId">{{ translate("Destination and product") }}</ion-select-option>
                <ion-select-option value="facilityName">{{ translate("Origin") }}</ion-select-option>
                <ion-select-option value="originFacilityProductId">{{ translate("Origin and product") }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none" button @click="updateAppliedFilters('', 'sort')">
              <ion-icon slot="start" :icon="swapVerticalOutline" />
              <ion-label slot="end">{{ translate("Created date") }}</ion-label>
              <ion-icon slot="end" :icon="arrowUpOutline" :class="query.sort === 'orderDate asc' ? 'sort-icon rotate' : 'sort-icon'" />
            </ion-item>
          </section>

          <hr />

          <div class="empty-state" v-if="isFetchingOrders">
            <ion-spinner name="crescent" />
            <p>{{ translate("Loading") }}</p>
          </div>
          <div class="empty-state" v-else-if="!ordersList.orders?.length">
            <p>{{ translate("No order found") }}</p>
          </div>
          <template v-else-if="query.groupBy === 'orderId'">
            <div v-for="(order, index) in ordersList.orders" :key="index" @click="router.push(`/order-detail/${order.orderId}`)">
              <section class="section-header">
                <ion-item class="primary-info" lines="none">
                  <ion-label>
                    <strong>{{ order.orderName }}</strong>
                    <p>{{ order.orderId }}</p>
                  </ion-label>
                </ion-item>
                <div class="tags">
                  <ion-chip outline>
                    <ion-icon :icon="sendOutline" />
                    <ion-label>{{ order.originFacilityName }}</ion-label>
                  </ion-chip>
                  <ion-chip outline>
                    <ion-icon :icon="downloadOutline" />
                    <ion-label>{{ order.destinationFacilityName }}</ion-label>
                  </ion-chip>
                </div>
                <div class="metadata">
                  <ion-note>{{ translate("Created on") }} {{ formatUtcDate(order.orderDate, "dd LLL yyyy") }}</ion-note>
                  <ion-badge :color="getColorByDesc(order.orderStatusDesc) || getColorByDesc('default')">{{ order.orderStatusDesc }}</ion-badge>
                </div>
              </section>
  
              <section>
                <div class="list-item" v-for="(item, index) in order.doclist.docs" :key="index">
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
                    <ion-badge slot="end" :color="getColorByDesc(item.orderItemStatusDesc) || getColorByDesc('default')">{{ item.orderItemStatusDesc }}</ion-badge>
                  </ion-item>
                </div>
              </section>
              <hr />
            </div>
          </template>
          <template v-else>
            <ion-accordion-group :multiple="true">
              <template v-for="(order, index) in ordersList.orders" :key="index">
                <ion-accordion :value="index">
                  <template v-if="query.groupBy === 'facilityName' || query.groupBy === 'orderFacilityName'">
                    <div class="list-item" slot="header" color="light">
                      <ion-item lines="none">
                        <ion-icon slot="start" :icon="query.groupBy === 'facilityName' ? sendOutline : downloadOutline" />
                        <ion-label>
                          {{ order.groupValue }}
                          <p>{{ query.groupBy === 'facilityName' ? order.originFacilityId : order.destinationFacilityId }}</p>
                        </ion-label>
                      </ion-item>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ order.totalOrdered || 0 }}
                          <p>{{ translate("ordered") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ order.totalShipped || 0 }}
                          <p>{{ translate("shipped") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ order.totalReceived || 0 }}
                          <p>{{ translate("received") }}</p>
                        </ion-label>
                      </div>
                      <div class="ion-padding-end">
                        <ion-icon :icon="chevronDownOutline" class="ion-accordion-toggle-icon" />
                      </div>
                    </div>
                    <div class="ion-padding" slot="content">
                      <div class="list-item" v-for="(item, index) in order.doclist.docs" :key="index" @click="router.push(`/order-detail/${item.orderId}`)">
                        <ion-item lines="none">
                          <ion-label class="ion-text-wrap">
                            {{ item.orderName }}
                            <p>{{ item.orderId }}</p>
                          </ion-label>
                        </ion-item>
                        <ion-chip outline>
                          <ion-icon :icon="query.groupBy === 'facilityName' ? downloadOutline : sendOutline" />
                          <ion-label>{{ query.groupBy === "facilityName" ? item.orderFacilityName : item.facilityName }}</ion-label>
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
                          <ion-badge slot="end" :color="getColorByDesc(item.orderItemStatusDesc) || getColorByDesc('default')">{{ item.orderItemStatusDesc }}</ion-badge>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
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
                        <ion-icon :icon="query.groupBy === 'originFacilityProductId' ? sendOutline : downloadOutline" />
                        <ion-label>{{ query.groupBy === "originFacilityProductId" ? order.originFacilityName : order.destinationFacilityName }}</ion-label>
                      </ion-chip>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ order.totalOrdered || 0 }}
                          <p>{{ translate("ordered") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ order.totalShipped || 0 }}
                          <p>{{ translate("shipped") }}</p>
                        </ion-label>
                      </div>
                      <div class="tablet ion-text-center">
                        <ion-label>
                          {{ order.totalReceived || 0 }}
                          <p>{{ translate("received") }}</p>
                        </ion-label>
                      </div>
                      <div class="ion-padding-end tablet">
                        <ion-icon :icon="chevronDownOutline" class="ion-accordion-toggle-icon" />
                      </div>
                    </div>
                    <div class="ion-padding" slot="content">
                      <div class="list-item" v-for="(item, index) in order.doclist.docs" :key="index" @click="router.push(`/order-detail/${item.orderId}`)">
                        <ion-item lines="none">
                          <ion-label class="ion-text-wrap">
                            {{ item.orderName }}
                            <p>{{ item.orderId }}</p>
                          </ion-label>
                        </ion-item>
                        <ion-chip outline>
                          <ion-icon :icon="query.groupBy === 'originFacilityProductId' ? downloadOutline : sendOutline" />
                          <ion-label>{{ query.groupBy === "originFacilityProductId" ? item.orderFacilityName : item.facilityName }}</ion-label>
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
                          <ion-badge slot="end" :color="getColorByDesc(item.orderItemStatusDesc) || getColorByDesc('default')">{{ item.orderItemStatusDesc }}</ion-badge>
                        </div>
                      </div>
                    </div>
                  </template>
                </ion-accordion>
              </template>
            </ion-accordion-group>
          </template>

          <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" v-show="isScrollable" ref="infiniteScrollRef">
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
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components'
import router from '@/router';
import Image from '@/components/Image.vue';
import Filters from "@/components/Filters.vue";
import { useStore } from 'vuex';
import { computed, ref } from "vue";
import { formatUtcDate, getColorByDesc } from "@/utils"

const productIdentificationStore = useProductIdentificationStore();
const store = useStore();

const queryString = ref("");
const isFetchingOrders = ref(false);
const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const ordersList = computed(() => store.getters["order/getOrders"])
const query = computed(() => store.getters["order/getQuery"])
const productStoreOptions = computed(() => store.getters["order/getProductStoreOptions"])
const originFacilityOptions = computed(() => store.getters["order/getOriginFacilityOptions"])
const destinationFacilityOptions = computed(() => store.getters["order/getDestinationFacilityOptions"])
const orderStatuses = computed(() => store.getters["order/getOrderStatuses"])
const shipmentMethodOptions = computed(() => store.getters["order/getShipmentMethodOptions"])
const carrierOptions = computed(() => store.getters["order/getCarrierOptions"])
const getProduct = computed(() => store.getters["product/getProduct"])
const isScrollable = computed(() => store.getters["order/isScrollable"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])
const getShipmentMethodDesc = computed(() => store.getters["util/getShipmentMethodDesc"])

onIonViewWillEnter(async () => {
  isFetchingOrders.value = true;
  await Promise.allSettled([store.dispatch('order/findOrders', { fetchFacets: true }), store.dispatch('util/fetchStatusDesc'), store.dispatch("util/fetchCarriersDetail"), store.dispatch("util/fetchShipmentMethodTypeDesc")])
  isFetchingOrders.value = false;
})

async function updateAppliedFilters(value: string | boolean, filterName: string) {
  isFetchingOrders.value = true
  if(filterName === "sort") value = query.value.sort === 'orderDate desc' ? 'orderDate asc' : 'orderDate desc'
  await store.dispatch('order/updateAppliedFilters', { value, filterName })
  isFetchingOrders.value = false
}

async function loadMoreOrders(event: any) {
  // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  await store.dispatch('order/findOrders', {
    viewSize: undefined,
    viewIndex: Math.ceil(ordersList.value.orders.length / 10).toString()
  }).then(async () => {
    await event.target.complete();
  })
}

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef?.value?.$el?.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
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
  grid-template-areas: "info metadata"
                       "tags tags";
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
    grid: "info tags metadata" / 1fr max-content 1fr;
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