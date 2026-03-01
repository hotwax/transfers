<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ isReceipt ? translate("Receipt details") : translate("Shipment details") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <template v-if="isReceipt">
        <ion-item>
          <ion-label>
            <p>{{ translate("Received date") }}</p>
            {{ formatDateTime(event.statusDatetime) }}
          </ion-label>
        </ion-item>
      </template>
      <template v-else>
        <ion-item>
          <ion-label>
            <p>{{ translate("Shipment ID") }}</p>
            {{ event.shipmentId }}
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>{{ translate("Shipped date") }}</p>
            {{ event.statusDatetime ? formatDateTime(event.statusDatetime) : "-" }}
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>{{ translate("Method") }}</p>
            {{ event.shipmentMethodDesc || "-" }}
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <p>{{ translate("Carrier") }}</p>
            {{ event.carrierDesc || "-" }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label>
            <p>{{ translate("Tracking code") }}</p>
            {{ event.trackingIdNumber || "-" }}
          </ion-label>
        </ion-item>
      </template>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components';
import { DateTime } from "luxon";

const props = defineProps(["event", "isReceipt"]);

function closeModal() {
  modalController.dismiss();
}

function formatDateTime(date: any) {
  if (!date) return "-";
  return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
}
</script>
