<template>
  <ion-content>
    <ion-list>
      <ion-list-header v-if="item?.productId">{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button @click="handleItemAction('bookQOH')">
        {{ translate("Book QoH") }}
      </ion-item>
      <ion-item button @click="handleItemAction('bookATP')">
        {{ translate("Book ATP") }}
      </ion-item>
      <ion-item button lines="none" @click="handleItemAction('remove')">
        {{ translate("Remove from order") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, popoverController } from "@ionic/vue"
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed , defineProps } from "vue";
import store from "@/store";

const productIdentificationStore = useProductIdentificationStore();
defineProps(["item"]);

const getProduct = computed(() => store.getters["product/getProduct"])

function handleItemAction(action: string) {
  popoverController.dismiss({ action })
}
</script>