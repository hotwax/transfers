<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" v-if="showFooter()">
        <ion-tab-button tab="transfers" href="/tabs/transfers">
          <ion-icon :icon="businessOutline" />
          <ion-label>{{ translate("Transfers") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-icon :icon="settingsOutline" />
          <ion-label>{{ translate("Settings") }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from "@ionic/vue";
import { businessOutline, settingsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import { translate } from "@hotwax/dxp-components";

const router = useRouter();

function showFooter() {
  if (['/tabs/transfers', '/tabs/settings'].includes(router.currentRoute.value.path)) return true
  return false
}
</script>

<style scoped>
ion-tab-bar { 
  bottom: 0px;
  width: 100%;
  transition: width .5s ease-in-out, bottom 1s ease-in-out;
}

@media (min-width: 991px) {
  ion-tab-bar {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: var(--spacer-base);
    width: 375px;
    box-shadow: rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px; 
    border-radius: 15px;
  }
}
</style>
