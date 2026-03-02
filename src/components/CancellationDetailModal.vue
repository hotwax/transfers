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
      <ion-item v-for="(item, index) in event.items" :key="index">
        <ion-label>
          <p class="overline">{{ item.orderItemSeqId }}</p>
          {{ item.productName }}
          <p v-if="item.statusUserLogin">{{ translate("Cancelled by") }}: {{ item.statusUserLogin }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components';
import { DateTime } from "luxon";

defineProps(["event"]);

function closeModal() {
  modalController.dismiss();
}

function formatDateTime(date: any) {
  if (!date) return "-";
  return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
}
</script>
