<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>

      <section>
        <DxpOmsInstanceNavigator />
        <DxpProductStoreSelector @updateEComStore="updateProductStore" />
      </section>

      <hr />

      <DxpAppVersionInfo />

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import { useStore } from "vuex";
import Image from "@/components/Image.vue";
import { openOutline } from "ionicons/icons";
import { translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from "@/logger";

const store = useStore()

const userProfile = computed(() => store.getters["user/getUserProfile"])

function logout() {
  store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl: string) => {
    // if not having redirection url then redirect the user to launchpad
    if(!redirectionUrl) {
      const redirectUrl = window.location.origin + '/login'
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
    }
  })
}

async function timeZoneUpdated(tzId: string) {
  await store.dispatch("user/setUserTimeZone", tzId)
}

async function updateProductStore(selectedProductStore: any) {
  await useProductIdentificationStore().getIdentificationPref(selectedProductStore.productStoreId)
    .catch((error) => logger.error(error));
}

function goToLaunchpad() {
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
}
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  hr {
    border-top: 1px solid var(--border-medium);
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
</style>
