<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ item.productId }}</ion-list-header>
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
import { translate } from "@hotwax/dxp-components";
import { defineProps } from "vue";

defineProps(["item"]);

function handleItemAction(action: any) {
  popoverController.dismiss({ dismissed: true, action })
}
</script>