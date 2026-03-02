<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/tabs/transfers`" />
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/bulk-upload')">{{ translate("Bulk upload") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter-content">
      <div class="find">
        <section class="search">
          <ion-item>
            <ion-input :label="translate('Transfer name')" :placeholder="translate('Name')" v-model="currentOrder.name" />
          </ion-item>
        </section>

        <aside class="filters">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Assign") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-icon :icon="storefrontOutline" slot="start" />
              <ion-select value="" :label="translate('Product Store')" :placeholder="translate('Select')" interface="popover" v-model="currentOrder.productStoreId" @ionChange="productStoreUpdated()">
                <ion-select-option v-for="store in stores" :value="store.productStoreId" :key="store.productStoreId">{{ store.storeName ? store.storeName : store.productStoreId }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-icon :icon="sendOutline" slot="start" />
              <ion-label>{{ translate("Origin") }}</ion-label>
              <template v-if="currentOrder.originFacilityId" slot="end">
                <ion-chip outline @click="openSelectFacilityModal('originFacilityId')">
                  {{ getFacilityName(currentOrder.originFacilityId) ? getFacilityName(currentOrder.originFacilityId) : currentOrder.originFacilityId }}
                </ion-chip>
              </template>
              <ion-button v-else slot="end" fill="outline" @click="openSelectFacilityModal('originFacilityId')">
                <ion-icon slot="start" :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>{{ translate("Destination") }}</ion-label>
              <template v-if="currentOrder.destinationFacilityId" slot="end">
                <ion-chip outline @click="openSelectFacilityModal('destinationFacilityId')">
                  {{ getFacilityName(currentOrder.destinationFacilityId) ? getFacilityName(currentOrder.destinationFacilityId) : currentOrder.destinationFacilityId }}
                </ion-chip>
              </template>
              <ion-button v-else slot="end" fill="outline" @click="openSelectFacilityModal('destinationFacilityId')">
                <ion-icon slot="start" :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Shipping Method") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-select :label="translate('Carrier')" :placeholder="translate('Select')" v-model="currentOrder.carrierPartyId" interface="popover" @ionChange="selectUpdatedMethod()">
                <ion-select-option :value="carrierPartyId" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index">{{ getCarrierDesc(carrierPartyId) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Method')" :placeholder="translate('Select')" v-model="currentOrder.shipmentMethodTypeId" v-if="getCarrierShipmentMethods()?.length" interface="popover">
                <ion-select-option :value="shipmentMethod.shipmentMethodTypeId" v-for="(shipmentMethod, index) in getCarrierShipmentMethods()" :key="index">{{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}</ion-select-option>
              </ion-select>
              <template v-else>
                <ion-icon :icon="informationCircleOutline" slot="start" />
                <ion-label>{{ translate("No shipment methods found") }}</ion-label>
              </template>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Plan") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-select :label="translate('Lifecycle')" placeholder="Select" v-model="currentOrder.statusFlowId" interface="popover">
                <ion-select-option v-for="flow in statusFlows" :key="flow.statusFlowId" :value="flow.statusFlowId">{{ translate(flow.description) }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Ship Date") }}</ion-label>
              <ion-button slot="end" class="date-time-button" @click="openDateTimeModal('shipDate')">{{ currentOrder.shipDate ? formatDateTime(currentOrder.shipDate) : translate("Select date") }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Delivery Date") }}</ion-label>
              <ion-button slot="end" class="date-time-button" @click="openDateTimeModal('deliveryDate')">{{ currentOrder.deliveryDate ? formatDateTime(currentOrder.deliveryDate) : translate("Select date") }}</ion-button>
            </ion-item>
          </ion-card>

        </aside>

        <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="closeDateTimeModal">
          <ion-content :force-overscroll="false">
            <ion-datetime 
              :value="currentOrder[selectedDateFilter] ? currentOrder[selectedDateFilter] : DateTime.now().toISO()"
              :show-clear-button="true"
              show-default-buttons
              presentation="date"
              :min="currentOrder.shipDate ? currentOrder.shipDate : undefined"
              :max="currentOrder.deliveryDate ? currentOrder.deliveryDate : undefined" 
              @ionChange="updateDateTimeFilter($event.detail.value)"
            />
          </ion-content>
        </ion-modal>

        <main>
          <ion-card class="add-items">
            <div class="mode">
              <h5 class="ion-margin-horizontal">{{ translate("Add items") }}</h5>
              <ion-segment v-model="mode" @ionChange="segmentChange($event.detail.value as string)">
                <ion-segment-button value="scan" content-id="scan">
                  <ion-icon :icon="barcodeOutline"/>
                </ion-segment-button>
                <ion-segment-button :disabled="isForceScanEnabled" value="search" content-id="search">
                  <ion-icon :icon="searchOutline"/>
                </ion-segment-button>
              </ion-segment>
            </div>
            <!-- Scanning -->
            <div v-show="mode === 'scan'">
              <!-- scanning input -->
              <ion-item lines="full">
                <ion-input ref="scanInput" v-model="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier" @ionBlur="isScanningEnabled = false" @ionFocus="isScanningEnabled = true" @keyup.enter="queryString = $event.target.value; scanProduct()" />
              </ion-item>
              <!-- product found after scan (reads from searchedProduct) -->
              <ion-item lines="none" v-if="searchedProduct.productId">
                <ion-thumbnail slot="start">
                  <Image :src="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" :key="getProduct(searchedProduct.productId)?.mainImageUrl || searchedProduct.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ getProductIdentificationValue(barcodeIdentifier, getProduct(searchedProduct.productId)) }}
                  <p>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}</p>
                  <p v-if="getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) !== 'null'">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                </ion-label>
                <ion-icon v-if="!isAddingProduct" :icon="checkmarkDoneOutline" color="success" slot="end"/>
                <ion-spinner v-else name="crescent" slot="end" />
              </ion-item>
              
              <!-- scanned no match -->
              <ion-item lines="none" v-else-if="searchedProduct.scannedId && !searchedProduct.productId">
                <ion-icon :icon="cloudOfflineOutline" slot="start"/>
                <ion-label>
                  {{ searchedProduct.scannedId }} {{ translate("not found") }}
                  <p>{{ translate("Try searching using a keyword instead") }}</p>
                </ion-label>
                <!-- need to add match product button -->
                <ion-button size="small" slot="end" color="primary" @click="enableSearch">
                  <ion-icon slot="start" :icon="searchOutline"/>
                  {{ translate("Search") }}
                </ion-button>
              </ion-item>
  
              <!-- scanner not focused -->
              <ion-item lines="none" v-else-if="!isScanningEnabled">
                <ion-thumbnail slot="start">
                  <Image/>
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Your scanner isn’t focused yet.") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-button slot="end" color="warning" size="small" @click="enableScan">
                  <ion-icon slot="start" :icon="locateOutline"/>
                  {{ translate("Focus scanning") }}
                </ion-button>
              </ion-item>
  
              <!-- default / idle state -->
              <ion-item lines="none" v-else>
                <ion-thumbnail slot="start">
                  <Image/>
                </ion-thumbnail>
                <ion-label>
                  {{ translate("Begin scanning products to add them to this transfer") }}
                  <p>{{ translate("Scanning is set to") }} {{ barcodeIdentificationDesc[barcodeIdentifier] || barcodeIdentifier }}</p>
                  <p v-if="barcodeIdentifier !== 'SKU'">{{ translate("Swap to SKU from the settings page") }}</p>
                </ion-label>
                <ion-badge slot="end" color="success">{{ translate("start scanning") }}</ion-badge>
              </ion-item>
            </div>
            <!-- Searching -->
            <div v-show="mode === 'search'">
              <!-- searching products input-->
              <ion-searchbar data-testid="search-product-input" ref="searchInput" v-model="queryString" :placeholder="translate('Search')" @ionClear="clearSearch" />
  
              <!-- searching spinner -->
              <ion-item lines="none" v-if="isSearchingProduct">
                <ion-spinner name="crescent" />
              </ion-item>
              
              <!-- result found -->
              <ion-list lines="none" v-else-if="searchedProduct.productId">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <Image :src="searchedProduct.mainImageUrl" :key="searchedProduct.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(searchedProduct.productId)) : getProduct(searchedProduct.productId)?.internalName }}
                    <p v-if="getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) !== 'null'">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(searchedProduct.productId)) }}</p>
                  </ion-label>
                  <template v-if="!isProductAvailableInOrder(searchedProduct.productId)">
                    <ion-button data-testid="add-to-transfer-btn" :disabled="isAddingProduct" slot="end" fill="outline" @click="addProductToCount()">
                      {{ isAddingProduct ? translate("Adding...") : translate("Add to Transfer") }}
                    </ion-button>
                  </template>
                  <template v-else>
                    <ion-icon slot="end" :icon="checkmarkCircle" color="success" />
                  </template>
                </ion-item>
                <ion-item button v-if="productSearchCount > 1" data-testid="view-more-results" detail @click="isSearchResultsModalOpen = true">
                  {{ productSearchCount - 1 }} {{ translate("more results") }}
                </ion-item>
              </ion-list>
              
              <!-- no search result -->
              <ion-list lines="none" v-else-if="queryString">
                <ion-item>
                  <ion-icon :icon="cloudOfflineOutline" slot="start"/>
                  <ion-label>
                    {{ translate("No product found") }}
                    <p>{{ translate("Try a different keyword") }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>
  
              <!-- before searching -->
              <ion-item lines="none" v-else>
                <ion-icon :icon="shirtOutline" slot="start"/>
                {{ translate("Search for products by their Parent name, SKU or UPC") }}
              </ion-item>
            </div>
          </ion-card>
  
          <hr />
  
          <template v-if="currentOrder.items?.length">
            <h1 class="ion-padding">{{ translate("Transfer items") }}</h1>
            <div class="list-item ion-padding-vertical">
              <ion-item lines="none" class="item-qty-actions" style="grid-column: span 2;">
                <ion-button fill="outline" color="medium" @click="updateBulkOrderItemQuantity('bookQOH')">{{ translate("Book QoH") }}</ion-button>
                <ion-button fill="outline" color="medium" @click="updateBulkOrderItemQuantity('bookATP')">{{ translate("Book ATP") }}</ion-button>
                <ion-button fill="outline" color="medium" @click="updateBulkOrderItemQuantity('customQty')">{{ translate("Custom Qty") }}</ion-button>
              </ion-item>
              <div></div>
              <div class="tablet">
                <ion-checkbox :modelValue="isEligibleForBulkAction()" @ionChange="toggleBulkSelection($event.detail.checked)" />
              </div>
              <ion-button slot="end" fill="clear" color="medium" :disabled="!isEligibleForBulkAction()" @click="openOrderItemActionsPopover($event, null, true)">
                <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
              </ion-button>
            </div>
  
            <div class="list-item" v-for="(item, index) in currentOrder.items" :key="index" :id="item.scannedId || getProductIdentificationValue(barcodeIdentifier, getProduct(item.productId))">
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <Image :src="getProduct(item.productId)?.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                  <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
              </ion-item>
              <div class="tablet">
                <ion-chip outline :color="isQOHAvailable(item) ? '' : 'warning'">
                  <ion-icon slot="start" :icon="sendOutline" />
                  <ion-label>{{ item.qoh ?? 0 }} {{ translate("QOH") }}</ion-label>
                </ion-chip>
              </div>
              <ion-item>
                <ion-input type="number" :label="translate('Qty')" label-placement="floating" min="0" v-model="item.quantity" :clear-input="true" />
              </ion-item>
              <div class="tablet">
                <ion-checkbox v-model="item.isChecked" />
              </div>
              <ion-button slot="end" fill="clear" color="medium" @click="openOrderItemActionsPopover($event, item)">
                <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
              </ion-button>
            </div>
          </template>
          <div v-else class="ion-text-center">
            <p>{{ translate("Add items to this transfer by scanning or searching for products using keywords") }}</p>
            <ion-button class="ion-margin-end" :color="mode === 'scan' ? 'primary' : 'medium'" :fill="mode === 'scan' ? 'solid' : 'outline'" @click="enableScan">
              <ion-icon :icon="barcodeOutline" slot="start"/>
              {{ translate("Start scanning") }}
            </ion-button>
            <ion-button :disabled="isForceScanEnabled" :color="mode === 'search' ? 'primary' : 'medium'" :fill="mode === 'search' ? 'solid' : 'outline'" @click="enableSearch">
              <ion-icon :icon="searchOutline" slot="start"/>
              {{ translate("Search products") }}
            </ion-button>
          </div>
        </main>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createOrder()">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
      <ion-modal :is-open="isSearchResultsModalOpen" @didDismiss="closeSearchResultsModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeSearchResultsModal">
                <ion-icon :icon="closeOutline" slot="icon-only" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Add a product") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar :value="queryString" :placeholder="translate('Search products')" @keyup.enter="queryString = $event.target.value; findProduct()"/>
          <ion-list lines="none">
            <ion-item v-for="product in searchedProducts" :key="product.productId">
              <ion-avatar slot="start">
                <Image :src="product.mainImageUrl" />
              </ion-avatar>
              <ion-label>
                {{ getProductIdentificationValue(productIdentificationPref.primaryId, product) ? getProductIdentificationValue(productIdentificationPref.primaryId, product) : product.productName }}
                <p v-if="getProductIdentificationValue(productIdentificationPref.secondaryId, product) !== 'null'">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}</p>
              </ion-label>
              <template v-if="!isProductAvailableInOrder(product.productId)">
                <ion-button fill="outline" @click="addProductToCount(product)" :disabled="isAddingProduct">
                  {{ isAddingProduct ? translate("Adding...") : translate("Add to Transfer") }}
                </ion-button>
              </template>
              <template v-else>
                <ion-icon slot="end" :icon="checkmarkCircle" color="success" />
              </template>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCheckbox, IonChip, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonModal, IonPage, IonRadio, IonRadioGroup, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewDidEnter, alertController, modalController, popoverController, IonSegment, IonSegmentButton, IonSearchbar, IonBadge, IonFooter, IonButtons, IonText } from '@ionic/vue';
import { addCircleOutline, arrowBackOutline, checkmarkCircle, checkmarkDoneOutline, closeOutline, ellipsisVerticalOutline, informationCircleOutline, listOutline, sendOutline, storefrontOutline, downloadOutline, barcodeOutline, searchOutline, shirtOutline, cloudOfflineOutline, locateOutline } from 'ionicons/icons';
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from '@hotwax/dxp-components'
import { computed, ref, watch, nextTick } from "vue";
import { getDateWithOrdinalSuffix, showToast } from '@/utils';
import logger from '@/logger';
import { useStore } from 'vuex';
import Image from '@/components/Image.vue';
import OrderItemActionsPopover from '@/components/OrderItemActionsPopover.vue';
import SelectFacilityModal from '@/components/SelectFacilityModal.vue';
import { ProductService } from '@/services/ProductService';
import { UtilService } from '@/services/UtilService';
import { OrderService } from '@/services/OrderService';
import router from '@/router';
import { DateTime } from 'luxon';
import { hasError } from "@/adapter";
import emitter from '@/event-bus';

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();

let timeoutId = ref();
const isSearchingProduct = ref(false);
const searchedProduct = ref({}) as any;
const searchedProducts = ref<any[]>([]);
const isSearchResultsModalOpen = ref(false);
const queryString = ref("");
const stores = ref([]) as any;
const dateTimeModalOpen = ref(false);
const isAddingProduct = ref(false)
const selectedDateFilter = ref("");
const currencyUom = ref("");
const mode = ref('search');
const isScanningEnabled = ref(false);
const lastScannedId = ref('');
const scanInput = ref(null) as any;
const searchInput = ref(null) as any;
const barcodeIdentificationDesc = ref({}) as any;
const productSearchCount = ref(0);
const isOrderLoading = ref(false);
const currentOrder = ref<{
  name: string;
  productStoreId: string;
  originFacilityId: string;
  destinationFacilityId: string;
  carrierPartyId: string;
  shipmentMethodTypeId: string; 
  items: any[];
  statusFlowId: string;
  shipDate: string;
  deliveryDate: string;
  [key: string]: any;
}>({
  name: "",
  productStoreId: "",
  originFacilityId: "",
  destinationFacilityId: "",
  carrierPartyId: "",
  shipmentMethodTypeId: "", 
  items: [],
  statusFlowId: "TO_Fulfill_And_Receive",
  shipDate: "",
  deliveryDate: ""
});
//TODO: In future when transfers app is migrated to Moqui, fetch the status flows using API
const statusFlows = [
  {
    statusFlowId: "TO_Fulfill_And_Receive",
    description: "Fulfill & Receive"
  },
  {
    statusFlowId: "TO_Fulfill_Only",
    description: "Fulfill only"
  },
  {
    statusFlowId: "TO_Receive_Only",
    description: "Receive only"
  }
]

const getProduct = computed(() => store.getters["product/getProduct"])
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])
const facilities = computed(() => store.getters["util/getFacilitiesByProductStore"])
const barcodeIdentifier = computed(() => store.getters["util/getBarcodeIdentificationPref"] || 'SKU');
const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
const isForceScanEnabled = computed(() => store.getters['util/isForceScanEnabled'] || false);

// Implemented watcher to display the search spinner correctly. Mainly the watcher is needed to not make the findProduct call always and to create the debounce effect.
// Previously we were using the `debounce` property of ion-input but it was updating the searchedString and making other related effects after the debounce effect thus the spinner is also displayed after the debounce
// effect is completed.
watch(queryString, (value) => {
  const searchedString = value.trim()

  if(searchedString?.length) {
    isSearchingProduct.value = true
  } else {
    searchedProduct.value = {}
    searchedProducts.value = []
    isSearchingProduct.value = false
  }

  if(timeoutId.value) {
    clearTimeout(timeoutId.value)
  }

  // Storing the setTimeoutId in a variable as watcher is invoked multiple times creating multiple setTimeout instance those are all called, but we only need to call the function once.
  timeoutId.value = setTimeout(() => {
    if(searchedString?.length) findProduct()
  }, 300)

}, { deep: true })

onIonViewDidEnter(async () => {
  emitter.emit("presentLoader")
  stores.value = useUserStore().eComStores
  const currentProductStoreId = (useUserStore().getCurrentEComStore as any)?.productStoreId || "";
  currentOrder.value.productStoreId = currentProductStoreId
  await Promise.allSettled([store.dispatch("util/fetchStoreCarrierAndMethods", currentProductStoreId), store.dispatch("util/fetchCarriersDetail")])
  await fetchProductStoreDetails(currentProductStoreId);
  if(Object.keys(shipmentMethodsByCarrier.value)?.length) {
    currentOrder.value.carrierPartyId = Object.keys(shipmentMethodsByCarrier.value)[0]
    selectUpdatedMethod()
  }
  await fetchBarcodeIdentificationDesc();
  emitter.emit("dismissLoader")
})

async function fetchProductStoreDetails(productStoreId: string) {
  try {
    const resp = await UtilService.fetchProductStoreDetails({ productStoreId: productStoreId });
    if(!hasError(resp)) {
      currencyUom.value = resp.data.defaultCurrencyUomId;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
  }
}

async function fetchBarcodeIdentificationDesc() {
  try {
    const resp = await ProductService.fetchBarcodeIdentificationDesc({ parentTypeId: 'HC_GOOD_ID_TYPE' });
    
    if (!hasError(resp) && resp.data?.length) {
      barcodeIdentificationDesc.value = resp.data.reduce((identifierDesc: any, identifier: any) => {
        identifierDesc[identifier.goodIdentificationTypeId] = identifier.description;
        return identifierDesc;
      }, {});
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error("Failed to fetch product identification descriptions", err);
  }
}

async function addProductToCount(product?: any, scannedId?: string) {
  if (isAddingProduct.value) return
  const productToAdd = product || searchedProduct.value;
  if (!productToAdd.productId || (!product && !queryString.value)) return;
  if (isProductAvailableInOrder(productToAdd.productId)) {
    showToast(translate("Product already added"))
    return;
  }

  isAddingProduct.value = true

  let newProduct = { 
    productId: productToAdd.productId,
    sku: productToAdd.sku,
    quantity: 1, // Defaulting to 1 for the superior UX
    isChecked: false,
    scannedId: scannedId
  } as any;

  const stock = await fetchStock(newProduct.productId);
  if(stock?.qoh || stock?.qoh === 0) {
    newProduct = { ...newProduct, qoh: stock.qoh, atp: stock.atp };
  }

  currentOrder.value.items.push(newProduct);
  isAddingProduct.value = false
}

function closeSearchResultsModal() {
  isSearchResultsModalOpen.value = false;
  queryString.value = "";
}

function addProductFromModal() {
  // Not used anymore as we add directly from modal list
}

async function productStoreUpdated() {

  const isFacilityUpdated = currentOrder.value.originFacilityId !== facilities.value[0]?.facilityId
  if(isFacilityUpdated) {
    currentOrder.value.originFacilityId = "";
    currentOrder.value.destinationFacilityId = "";
    if(currentOrder.value.items.length) refetchAllItemsStock()
  }
  await store.dispatch("util/fetchStoreCarrierAndMethods", currentOrder.value.productStoreId);
  if(Object.keys(shipmentMethodsByCarrier.value)?.length) {
    currentOrder.value.carrierPartyId = Object.keys(shipmentMethodsByCarrier.value)[0]
    selectUpdatedMethod()
  }
}

function selectUpdatedMethod() {
  const shipmentMethods = getCarrierShipmentMethods()
  if(shipmentMethods?.length) currentOrder.value.shipmentMethodTypeId = shipmentMethods[0]?.shipmentMethodTypeId
}

function isQOHAvailable(item: any) {
  return item.qoh && Number(item.qoh) > Number(item.quantity)
}

function getCarrierShipmentMethods() {
  return currentOrder.value.carrierPartyId && shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
}

function getFacilityName(facilityId: any) {
  return facilities.value?.find((facility: any) => facility.facilityId === facilityId)?.facilityName
}

async function updateBulkOrderItemQuantity(action: any) {
  if(!isEligibleForBulkAction()) {
    showToast(translate("No order item is selected for bulk action."))
    return;
  }

  if(action === "bookQOH" || action === "bookATP") {
    currentOrder.value.items.map((item: any) => {
      if(item.isChecked) {
        item.quantity = (action === "bookQOH") ? item.qoh : item.atp
      }
    })
  } else if(action === "customQty") {
    const alert = await alertController.create({
      header: translate("Custom Qty"),
      buttons: [{
        text: translate("Cancel"),
        role: "cancel"
      }, {
        text: translate("Save"),
        handler: async (data: any) => {
          if(!data?.quantity) return false;
          const customQty = Number(data.quantity);
          currentOrder.value.items.map((item: any) => {
            if(item.isChecked) {
              item.quantity = customQty
            }
          }) 
        }
      }],
      inputs: [{
        name: "quantity",
        placeholder: translate("ordered quantity"),
        min: 0,
        type: "number"
      }]
    })
    alert.present()
  }
}

async function createOrder() {
  if(!currentOrder.value.items?.length) {
    showToast(translate("Please add atleast one item in the order."));
    return;
  }

  if(!currentOrder.value.name.trim()) {
    showToast(translate("Please give some valid transfer order name."))
    return;
  }

  if(!currentOrder.value.productStoreId || !currentOrder.value.originFacilityId || !currentOrder.value.destinationFacilityId || !currentOrder.value.carrierPartyId || !currentOrder.value.shipmentMethodTypeId) {
    showToast(translate("Please select all the required properties assigned to the order."))
    return;
  }

  if(currentOrder.value.originFacilityId === currentOrder.value.destinationFacilityId) {
    showToast(translate("Origin and destination facility can't be same."))
    return;
  }


  const isItemQuantityInvalid = currentOrder.value.items.some((item: any) => !Number(item.quantity) || Number(item.quantity) < 0)
  if(isItemQuantityInvalid) {
    showToast(translate("Order items must have a valid ordered quantity."))
    return;
  }

  if(!currentOrder.value.statusFlowId) {
    showToast(translate("Please select transfer order lifecycle."));
    return;
  }

  emitter.emit("presentLoader", { message: translate("Creating transfer order..."), backdropDismiss: false });

  const productIds = currentOrder.value.items?.map((item: any) => item.productId);
  const productAverageCostDetail = await UtilService.fetchProductsAverageCost(productIds, currentOrder.value.originFacilityId)
  
	const order = {
		orderName: currentOrder.value.name.trim(),
		orderTypeId: "TRANSFER_ORDER",
		customerId: "COMPANY",
		statusId: "ORDER_CREATED",
		productStoreId: currentOrder.value.productStoreId,
		statusFlowId: currentOrder.value.statusFlowId,
    currencyUom: currencyUom.value || 'USD',
		orderDate: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
		entryDate: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"),
		originFacilityId: currentOrder.value.originFacilityId,
		shipGroups: [
			{
				shipGroupSeqId: "00001",
				facilityId: currentOrder.value.originFacilityId,
				orderFacilityId: currentOrder.value.destinationFacilityId,
				carrierPartyId: currentOrder.value.carrierPartyId,
				shipmentMethodTypeId: currentOrder.value.shipmentMethodTypeId,
				estimatedShipDate: currentOrder.value.shipDate? DateTime.fromISO(currentOrder.value.shipDate).toFormat("yyyy-MM-dd 23:59:59.000") : "",
				estimatedDeliveryDate: currentOrder.value.deliveryDate ? DateTime.fromISO(currentOrder.value.deliveryDate).toFormat("yyyy-MM-dd 23:59:59.000"): "",
				items: currentOrder.value.items.map((item: any) => {
					return {
						orderItemTypeId: "PRODUCT_ORDER_ITEM",
						productId: item.productId,
						sku: item.sku,
						statusId: "ITEM_CREATED",
						quantity: Number(item.quantity),
						unitPrice: productAverageCostDetail[item.productId] || 0.0,
					}
				})
			}]
	} as any;

  let grandTotal = 0;
  order.shipGroups[0].items.map((item: any) => {
    grandTotal += Number(item.quantity) * Number(item.unitPrice)
  })

  order["grandTotal"] = grandTotal

  const addresses = await store.dispatch("util/fetchFacilityAddresses", [currentOrder.value.originFacilityId, currentOrder.value.destinationFacilityId])
  addresses.map((address: any) => {
    if(address.facilityId === currentOrder.value.originFacilityId) {
      order.shipGroups[0].shipFrom = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
    if(address.facilityId === currentOrder.value.destinationFacilityId) {
      order.shipGroups[0].shipTo = {
        postalAddress: {
          id: address.contactMechId
        }
      }
    }
  })

  try {
    const resp = await OrderService.createOrder({ payload: order })
    if(!hasError(resp)) {
      router.replace(`/order-detail/${resp.data.orderId}`)
      emitter.emit("dismissLoader")
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error)
    emitter.emit("dismissLoader")
    showToast(translate("Failed to create order."))
  }
}

function toggleBulkSelection(isChecked: any) {
  currentOrder.value.items.map((item: any) => item.isChecked = isChecked)
}

function isEligibleForBulkAction() {
  return currentOrder.value.items?.some((item: any) => item.isChecked)
}

async function openOrderItemActionsPopover(event: any, selectedItem: any, isBulkOperation = false){
  const popover = await popoverController.create({
    component: OrderItemActionsPopover,
    componentProps: { item: selectedItem },
    event,
    showBackdrop: false,
  });

  popover.onDidDismiss().then((result: any) => {
    const action = result.data?.action

    if(action === "bookQOH" || action === "bookATP") {
      if(isBulkOperation) {
        currentOrder.value.items.map((item: any) => {
          if(item.isChecked) {
            item.quantity = (action === "boolean") ? item.qoh : item.atp
          }
        })
      } else {
        selectedItem.quantity = (action === "bookQOH") ? selectedItem.qoh : selectedItem.atp
      }
    } else if(action === "remove") {
      currentOrder.value.items = isBulkOperation ? currentOrder.value.items.filter((item: any) => !item.isChecked) : currentOrder.value.items.filter((item: any) => selectedItem.productId !== item.productId)
    }
  })

  await popover.present();
}

async function openSelectFacilityModal(facilityType: any) {
  const addressModal = await modalController.create({
    component: SelectFacilityModal,
    componentProps: { selectedFacilityId: currentOrder.value[facilityType], facilities: facilities.value }
  })

  addressModal.onDidDismiss().then(async(result: any) => {
    if(result.data?.selectedFacilityId) {
      currentOrder.value[facilityType] = result.data.selectedFacilityId
      if(facilityType === "originFacilityId") {
        if(currentOrder.value.items.length) refetchAllItemsStock()
      }
    }
  })

  addressModal.present()
}

async function refetchAllItemsStock() {
  emitter.emit("presentLoader", { message: "Updating items...", backdropDismiss: false });
  const responses = await Promise.allSettled(currentOrder.value.items.map((item: any) => fetchStock(item.productId)))
  currentOrder.value.items.map((item: any, index: any) => {
    if(responses[index].status === "fulfilled") {
      item["qoh"] = responses[index]?.value?.qoh
      item["atp"] = responses[index]?.value?.atp
    }
  })
  emitter.emit("dismissLoader")
}

function isProductAvailableInOrder(productId?: string) {
  const id = productId || searchedProduct.value.productId;
  return currentOrder.value.items.some((item: any) => item.productId === id)
}

function clearQuery() {
  queryString.value = ''
  searchedProduct.value = {}
}

async function enableScan() {
  mode.value = 'scan';
  isScanningEnabled.value = true;
  setTimeout(() => {
    scanInput.value?.$el.setFocus?.()
  }, 0)
}

async function enableSearch() {
  mode.value = 'search';
  await nextTick();
  searchInput.value?.$el.setFocus?.()
  isScanningEnabled.value = false
}

function segmentChange(newMode: string) {
  clearQuery();
  newMode === 'search' ? enableSearch() : isScanningEnabled.value = false;
}

function clearSearch() {
  queryString.value = '';
  searchedProduct.value = {};
}

async function scanProduct() {
  const scannedId = queryString.value?.trim();
  if(!scannedId) return;
  queryString.value = '';

  if(timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }

  isSearchingProduct.value = true;
  const productFound: any = await findProduct(scannedId);
  if(productFound) {
    await addProductToCount(productFound, scannedId);
  }
}

function buildProductQuery(params: any) {
  const viewSize = params.viewSize || 100
  const viewIndex = params.viewIndex || 0

  const payload: any = {
    json: {
      params: {
        rows: viewSize,
        'q.op': 'AND',
        start: viewIndex * viewSize,
      },
      query: '(*:*)',
      filter: [`docType:${params.docType || 'PRODUCT'}`],
    },
  }

  if (params.keyword) {
    const wildcardTerms = params.keyword.split(/\s+/).filter(Boolean).map((term: any) => `*${term}*`).join(' OR ');
    payload.json.query = `(${wildcardTerms}) OR "${params.keyword}"^100`
    payload.json.params['qf'] = 'sku^100 upc^100 productName^50 internalName^40 parentProductName^40 productId groupId groupName'
    payload.json.params['defType'] = 'edismax'
  }

  if (params.filters) {
    params.filters.forEach((filter: any) => payload.json.filter.push(filter))
  }

  return payload
}

async function findProduct(value?: string) {
  const searchString = value || queryString.value.trim();
  if(!searchString) {
    isSearchingProduct.value = false;
    return null;
  }

  isSearchingProduct.value = true;
  try {
    let payload: any = {
      viewSize: 20
    }

    if(mode.value === 'scan' && value) {
      payload.filters = ['isVirtual: false', `goodIdentifications: ${barcodeIdentifier.value}/${value}`]
      payload = buildProductQuery(payload)
    } else {
      payload.keyword = searchString;
      payload.filters = ['isVirtual: false']
      payload = buildProductQuery(payload)
    }

    const resp = await ProductService.fetchProducts(payload)
    if (!hasError(resp) && resp.data.response?.docs?.length) {
      searchedProducts.value = resp.data.response.docs;
      productSearchCount.value = resp.data.response.numFound || resp.data.response.docs.length;
      
      searchedProduct.value = searchedProducts.value[0];
      store.dispatch("product/addProductToCached", searchedProduct.value)
    } else {
      searchedProduct.value = {}
      searchedProducts.value = []
      productSearchCount.value = 0;
    }
    isSearchingProduct.value = false;
    return null;
  } catch(err) {
    searchedProduct.value = {}
    logger.error("Product not found", err)
    isSearchingProduct.value = false;
    return null;
  }
}

async function fetchStock(productId: string) {
  try {
    const resp: any = await UtilService.getInventoryAvailableByFacility({
      productId,
      facilityId: currentOrder.value.originFacilityId
    });

    if(!hasError(resp)) {
      return resp.data;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err)
    return null;
  }
}

function formatDateTime(date: any) {
  const dateTime = DateTime.fromISO(date);
  return getDateWithOrdinalSuffix(dateTime.toMillis());
}

function updateDateTimeFilter(value: any) {
  currentOrder.value[selectedDateFilter.value] = value;
}

function closeDateTimeModal() {
  dateTimeModalOpen.value = false;
  selectedDateFilter.value = "";
}

function openDateTimeModal(type: any) {
  dateTimeModalOpen.value = true;
  selectedDateFilter.value = type;
}
</script>

<style scoped>
.list-item {
  --columns-desktop: 5;
  border-bottom: var(--border-medium);
}

/* Added width property as after updating to ionic7 min-width is getting applied on ion-label inside ion-item
which results in distorted label text and thus reduced ion-item width */
.list-item > ion-item {
  width: 100%;
}

.item-qty-actions {
  grid-column: span 2;
}

.find > .filters{
  display: unset;
}

.date-time-modal {
  --width: 320px;
  --height: 400px;
  --border-radius: 8px;
}

.pointer {
  cursor: pointer;
}

@media (min-width: 991px) {
  .add-items {
    grid-gap: 40px;
  }
}

.add-items .mode {
  display: flex;
  align-items: center;
  border-bottom: var(--border-medium);
}

.add-items .mode ion-segment {
  grid-auto-columns: minmax(auto, 150px);
  justify-content: start;
  flex: 0 1 max-content;
  width: max-content;
}
</style>