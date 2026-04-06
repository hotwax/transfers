<template>
  <ion-app data-testid="app-root">
    <ion-router-outlet data-testid="app-router-outlet" />
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import emitter from "@/event-bus"
import { Settings } from 'luxon'
import { initialise, resetConfig } from '@/adapter'
import { translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import logger from '@/logger';
import { useUserStore as useAppUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";

const userStore = useAppUserStore();
const utilStore = useUtilStore();
const userProfile = computed(() => userStore.current)
const userToken = computed(() => userStore.token)
const instanceUrl = computed(() => userStore.instanceUrl)

const loader = ref(null) as any
const maxAge = process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0

initialise({
  token: userToken.value,
  instanceUrl: instanceUrl.value,
  cacheMaxAge: maxAge,
  events: {
    unauthorised,
    responseError: () => {
      setTimeout(() => dismissLoader(), 100);
    },
    queueTask: (payload: any) => {
      emitter.emit("queueTask", payload);
    }
  },
  systemType: "MOQUI" //Need to update oms-api to use oms token instead of api key
})

async function unauthorised() {
  // Mark the user as unauthorised, this will help in not making the logout api call in actions
  userStore.logout({ isUserUnauthorised: true });
  const redirectUrl = window.location.origin + '/login';
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`;
}

async function presentLoader(options = { message: "Click the backdrop to dismiss.", backdropDismiss: false }) {
  // When having a custom message remove already existing loader, if not removed it takes into account the already existing loader
  if(options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: options.message ? translate(options.message) : (options.backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
        translucent: true,
        backdropDismiss: options.backdropDismiss || false
      });
  }
  loader.value.present();
}

function dismissLoader() {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null as any;
  }
}

onBeforeMount(() => {
  emitter.on('presentLoader', presentLoader);
  emitter.on('dismissLoader', dismissLoader);
})

onMounted(async () => {
  if (userProfile.value) {
    // Luxon timezone should be set with the user's selected timezone
    userProfile.value.timeZone && (Settings.defaultZone = userProfile.value.timeZone);
  }
  if(userToken.value) {
    const currentProductStore : any = useUserStore().getCurrentEComStore;
    await Promise.all([
      useProductIdentificationStore().getIdentificationPref(currentProductStore.productStoreId).catch((error) => logger.error(error)),
      utilStore.fetchFacilitiesByCurrentStore(currentProductStore.productStoreId).catch((error) => logger.error(error))
    ])
  }
})

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);

  resetConfig()
})
</script>
