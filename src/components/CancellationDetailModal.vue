<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Cancellation details") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-label>
          <p>{{ translate("Date") }}</p>
          {{ formatDateTime(event.statusDatetime) }}
        </ion-label>
      </ion-item>
      <ion-item-divider>
        <ion-label>{{ translate("Items") }}</ion-label>
      </ion-item-divider>
      <ion-item v-for="(item, index) in event.items" :key="index" lines="none">
        <ion-thumbnail slot="start">
          <Image :src="getProduct(item.productId)?.mainImageUrl" />
        </ion-thumbnail>
        <ion-label class="ion-text-wrap">
          <p class="overline">{{ item.orderItemSeqId }}</p>
          {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
          <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p v-if="item.statusUserLogin">{{ translate("Cancelled by") }}: {{ item.statusUserLogin }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonThumbnail, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { DateTime } from "luxon";
import Image from "@/components/Image.vue";
import { useStore } from "vuex";
import { computed } from "vue";

defineProps(["event"]);

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();
const getProduct = computed(() => store.getters["product/getProduct"]);

function closeModal() {
  modalController.dismiss();
}

function formatDateTime(date: any) {
  if (!date) return "-";
  return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
}
</script>
