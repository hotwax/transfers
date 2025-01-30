<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ "primary identifier" }}</ion-list-header>
      <ion-item>
        {{ translate("Edit ordered qty") }}
      </ion-item>
      <ion-item>
        {{ translate("Fulfill") }}
      </ion-item>
      <ion-item>
        {{ translate("Receive") }}
      </ion-item>
      <ion-item lines="none">
        {{ translate("Complete item") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader } from "@ionic/vue"
import { translate } from "@/i18n"
</script>