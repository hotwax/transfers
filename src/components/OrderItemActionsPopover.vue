<template>
  <ion-content>
    <ion-list>
      <ion-list-header v-if="item?.productId" data-testid="order-item-actions-popover-header">{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button @click="handleItemAction('bookQOH')" data-testid="order-item-action-book-qoh">
        {{ translate("Book QoH") }}
      </ion-item>
      <ion-item button @click="handleItemAction('bookATP')" data-testid="order-item-action-book-atp">
        {{ translate("Book ATP") }}
      </ion-item>
      <ion-item button lines="none" @click="handleItemAction('remove')" data-testid="order-item-action-remove">
        {{ translate("Remove from order") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue"
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed , defineProps } from "vue";
import { useProductStore } from "@/store/product";

const productIdentificationStore = useProductIdentificationStore();
defineProps(["item"]);
const productStore = useProductStore();

const getProduct = computed(() => productStore.getProduct)

function handleItemAction(action: string) {
  popoverController.dismiss({ action })
}
</script>
