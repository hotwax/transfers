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
              <ion-card-subtitle>{{ userProfile?.userId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.userFullName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button data-testid="settings-logout-btn" color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button data-testid="settings-go-launchpad-btn" :standalone-hidden="!userStore.hasPermission('COMMON_ADMIN')" fill="outline" @click="goToLaunchpad()">
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
        <DxpProductStoreSelector @updateProductStore="refreshProductStoreData($event)" />
      </section>

      <hr />

      <DxpAppVersionInfo data-testid="settings-app-version" />

      <section>
        <DxpProductIdentifier data-testid="settings-product-identifier" />
        <TimeZoneSwitcher data-testid="settings-timezone-switcher" @timeZoneUpdated="timeZoneUpdated" />
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import Image from "@/components/Image.vue";
import { openOutline } from "ionicons/icons";
import { useProductStore } from "@/store/productStore";
import { logger } from "@common";
import TimeZoneSwitcher from "@/components/TimeZoneSwitcher.vue"
import { useUserStore } from "@/store/user";
import DxpProductStoreSelector from "@/components/DxpProductStoreSelector.vue";
import DxpAppVersionInfo from "@/components/DxpAppVersionInfo.vue";
import DxpProductIdentifier from "@/components/DxpProductIdentifier.vue";
import DxpOmsInstanceNavigator from "@/components/DxpOmsInstanceNavigator.vue";
import { commonUtil, cookieHelper, translate } from "@common";
import { useAuth } from "@/composables/useAuth";


const userStore = useUserStore()
const productStore = useProductStore()
const { logout: authLogout } = useAuth()

const userProfile = computed(() => userStore.getUserProfile)
const oms = computed(() => commonUtil.getOmsURL())
const omsRedirectionInfo = computed(() => ({
  url: commonUtil.getOmsURL(),
  token: cookieHelper().get("token") || ""
}))

async function logout() {
  const redirectionUrl = await authLogout({ isUserUnauthorised: false })
  // if not having redirection url then redirect the user to login
  if(!redirectionUrl) {
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${import.meta.env.VITE_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
  } else {
    window.location.href = redirectionUrl
  }
}

async function timeZoneUpdated(tzId: string) {
  await userStore.setUserTimeZone(tzId)
}

const refreshProductStoreData = async (selectedProductStore: any) => {
  await productStore.fetchEComStoreDependencies(selectedProductStore?.productStoreId);
  await productStore.fetchProductStoreFacilities(selectedProductStore.productStoreId).catch((error: any) => logger.error(error))
};

function goToLaunchpad() {
  window.location.href = `${import.meta.env.VITE_LOGIN_URL}`
}

function goToOms(token: string, url: string) {
  window.open(`${url}/control/main?token=${token}`, '_blank');
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
  ion-content {
    --padding-bottom: 80px;
  }
</style>
