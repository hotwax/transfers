<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <TransferFiltersContent />
    </ion-content> 
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonMenu, IonTitle, IonToolbar } from "@ionic/vue";
import { translate } from "@hotwax/dxp-components";
import TransferFiltersContent from "./TransferFiltersContent.vue";

</script>