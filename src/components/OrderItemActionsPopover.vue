<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ "primary identifier" }}</ion-list-header>
      <ion-item>
        {{ translate("Book QoH") }}
      </ion-item>
      <ion-item>
        {{ translate("Book ATP") }}
      </ion-item>
      <ion-item lines="none">
        {{ translate("Remove from order") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader } from "@ionic/vue"
import { translate } from "@/i18n"
</script>