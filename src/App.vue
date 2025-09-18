<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import emitter from "@/event-bus"
import { Settings } from 'luxon'
import store from "./store";
import { initialise, resetConfig } from '@/adapter'
import { translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import logger from '@/logger';

const userProfile = computed(() => store.getters["user/getUserProfile"])
const userToken = computed(() => store.getters["user/getUserToken"])
const instanceUrl = computed(() => store.getters["user/getInstanceUrl"])

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
  }
})

async function unauthorised() {
  // Mark the user as unauthorised, this will help in not making the logout api call in actions
  store.dispatch("user/logout", { isUserUnauthorised: true });
  const redirectUrl = window.location.origin + '/login';
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`;
}

async function presentLoader(options = { message: "Click the backdrop to dismiss.", backdropDismiss: true }) {
  // When having a custom message remove already existing loader, if not removed it takes into account the already existing loader
  if(options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: translate(options.message),
        translucent: true,
        backdropDismiss: options.backdropDismiss
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
    await useProductIdentificationStore().getIdentificationPref(currentProductStore.productStoreId)
      .catch((error) => logger.error(error));
  }
})

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);

  resetConfig()
})
</script>