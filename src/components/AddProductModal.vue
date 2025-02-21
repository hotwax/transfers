<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar v-model="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="handleSearch" @ionInput="handleInput"/>

    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <Image :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <h2>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) || getProduct(product.productId).productName }}</h2>
            <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, product) }}</p>
          </ion-label>
          <ion-icon v-if="isProductAvailableInCurrentOrder(product.productId)" color="success" :icon="checkmarkCircle" />
          <ion-button v-else fill="outline" @click="addToCycleCount(product)">{{ translate("Add to count") }}</ion-button>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>

    <div v-else-if="queryString && isSearching && !products.length" class="empty-state">
      <p>{{ translate("No product found") }}</p>
    </div>
    <div v-else class="empty-state">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>{{ translate("Enter a SKU, or product name to search a product") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { computed, onUnmounted, ref } from "vue";
import { closeOutline, checkmarkCircle } from "ionicons/icons";
import store from "@/store";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import emitter from "@/event-bus";
import Image from "@/components/Image.vue"
import logger from "@/logger";
import { ProductService } from "@/services/ProductService";
import { hasError } from "@hotwax/oms-api";
import { OrderService } from "@/services/OrderService";

const productIdentificationStore = useProductIdentificationStore();

const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id))
const currentOrder = computed(() => store.getters["order/getCurrent"])

let queryString = ref('')
const isSearching = ref(false);
const products = ref([]) as any;
const total = ref(0) as any;

onUnmounted(() => {
  store.dispatch("product/clearProducts")
})

async function handleSearch() {
  if (!queryString.value) {
    isSearching.value = false; 
    store.dispatch("product/clearProducts");
    return;
  }
  await getProducts();
  isSearching.value = true;
}

async function getProducts( vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;

  try {
    const resp = await ProductService.fetchProducts({
      "filters": ['isVirtual: false', `sku: *${queryString.value}*`],
      viewSize,
      viewIndex
    })

    if(!hasError(resp) && resp.data.response?.docs?.length) {
      total.value = resp.data.response.numFound;
      const fetchProducts = resp.data.response.docs
      if(viewIndex) {
        products.value = products.value.concat(fetchProducts);
      } else {
        products.value = fetchProducts;
      }
      store.dispatch("product/addProductToCachedMultiple", { products: fetchProducts })
    } else {
      throw resp.data;
    }
  } catch(error) {
    logger.error(error)
    products.value = []
    total.value = 0
  }
}

function isScrollable() {
  return products.value?.length && products.value?.length < total.value
}

async function loadMoreProducts(event: any) {
  getProducts(
    undefined,
    Math.ceil(products.value.length / Number(process.env.VUE_APP_VIEW_SIZE)).toString()
  ).then(() => {
    event.target.complete();
  })
}

async function addToCycleCount(product: any) {
  const newProduct = {
    orderId: currentOrder.value.orderId,
    orderName: currentOrder.value.orderName,
    orderTypeId: currentOrder.value.orderTypeId,
    facilityId: currentOrder.value.facilityId,
    productStoreId: currentOrder.value.productStoreId,
    carrierPartyId: currentOrder.value.carrierPartyId,
    shipmentMethodTypeId: currentOrder.value.shipmentMethodTypeId,
    itemStatus: "ITEM_APPROVED",
    quantity: 1,
    productId: product.productId,
    customerId: "COMPANY",
    unitPrice: 0,
    unitListPrice: 0,
    grandTotal: 0,
    itemTotalDiscount: 0
  }

  try {
    const resp = await OrderService.addOrderItem(newProduct)

    if(!hasError(resp)) {
      const order = JSON.parse(JSON.stringify(currentOrder.value))
      order.items.push(newProduct); 
      await store.dispatch("order/updateCurrent", order)
      emitter.emit("generateItemsListByParent", product.productId)
    } else {
      throw resp.data;
    }
  } catch(error) {
    logger.error(error);
  }
}

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

function handleInput() {
  if (!queryString.value) {
    isSearching.value = false;
    store.dispatch("product/clearProducts");
  }
}

function isProductAvailableInCurrentOrder(id: string) {
  return currentOrder.value.items.some((item: any) => item.productId === id)
}
</script>
