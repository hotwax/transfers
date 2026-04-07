<template>
  <ion-app data-testid="app-root">
    <ion-router-outlet data-testid="app-router-outlet" />
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import { cookieHelper, emitter, logger } from "@common"
import { Settings } from 'luxon'
import { initialise, resetConfig, translate } from '@common'
// Merged cookieHelper into common import above
// Removed local logger import, now using @common logger
import { useAuth } from "@/composables/useAuth";
import { useUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";
import { useProductStore } from "@/store/productStore";

const utilStore = useUtilStore();
const productStore = useProductStore();
const { logout: authLogout } = useAuth();
const userProfile = computed(() => useUserStore().getUserProfile)
const userToken = computed(() => cookieHelper().get("token"))
const instanceUrl = computed(() => cookieHelper().get("oms"))

const loader = ref(null) as any
const maxAge = import.meta.env.VITE_CACHE_MAX_AGE ? parseInt(import.meta.env.VITE_CACHE_MAX_AGE) : 0

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
  await authLogout({ isUserUnauthorised: true });
  const redirectUrl = window.location.origin + '/login';
  window.location.href = `${import.meta.env.VITE_LOGIN_URL}?redirectUrl=${redirectUrl}`;
}

async function presentLoader(options: any) {
  const message = options?.message || "Click the backdrop to dismiss.";
  const backdropDismiss = options?.backdropDismiss || false;

  // When having a custom message remove already existing loader, if not removed it takes into account the already existing loader
  if(options?.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: options?.message ? translate(options.message) : (backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
        translucent: true,
        backdropDismiss: backdropDismiss
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
    const currentProductStore : any = productStore.getCurrentEComStore;
    await Promise.all([
      productStore.fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error)),
      productStore.fetchProductStoreFacilities(currentProductStore.productStoreId).catch((error) => logger.error(error))
    ])
  }
})

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);

  resetConfig()
})
</script>
