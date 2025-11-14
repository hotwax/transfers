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
          <ion-icon v-if="isProductInOrder(product.productId)" color="success" :icon="checkmarkCircle" />
          <ion-button v-else fill="outline" @click="addItemToOrder(product)" :disabled="pendingProductIds.has(product.productId)">
            {{ pendingProductIds.has(product.productId) ? translate("Adding...") : translate("Add to order") }}
          </ion-button>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable()">
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
import { computed, onUnmounted, ref, defineProps } from "vue";
import { closeOutline, checkmarkCircle } from "ionicons/icons";
import store from "@/store";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import emitter from "@/event-bus";
import Image from "@/components/Image.vue"
import logger from "@/logger";
import { ProductService } from "@/services/ProductService";
import { hasError } from "@/adapter";

const props = defineProps(["addProductToQueue", "pendingProductIds", "isProductInOrder", "onProductAdded"])

const productIdentificationStore = useProductIdentificationStore();

const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id))
const currentOrder = computed(() => store.getters["order/getCurrent"])

let queryString = ref('')
const isSearching = ref(false);
const products = ref([]) as any;
const total = ref(0) as any;

onUnmounted(() => {
  products.value = []
})

async function handleSearch() {
  if (!queryString.value.trim()) {
    isSearching.value = false; 
    products.value = [];
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
      "filters": ['isVirtual: false', 'isVariant: true'],
      keyword: queryString.value.trim(),
      viewSize,
      viewIndex
    })

    if(!hasError(resp) && resp.data.response?.docs?.length) {
      const productsList = resp.data.response.docs
      if(viewIndex) {
        products.value = products.value.concat(productsList);
      } else {
        products.value = productsList;
        total.value = resp.data.response.numFound;
      }
      store.dispatch("product/addProductToCachedMultiple", { products: productsList })
    } else {
      products.value = viewIndex ? products.value : [];
    }
  } catch(error) {
    logger.error(error)
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

function addItemToOrder(product: any) {
  const itemToAdd = {
    product: product,
    orderId: currentOrder.value.orderId,
    facilityId: currentOrder.value.facilityId,
    onSuccess: () => {
      props.onProductAdded?.();
    },
    onError: (product: any, error: any) => {
      logger.error(`Failed to add product ${product.productId}:`, error);
    }
  }
  props.addProductToQueue(itemToAdd);
}

function closeModal() {
  modalController.dismiss();
}

function handleInput() {
  if (!queryString.value.trim()) {
    isSearching.value = false;
    products.value = []
  }
}
</script>
