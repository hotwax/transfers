<template>
  <ion-app data-testid="app-root">
    <ion-router-outlet data-testid="app-router-outlet" />
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import { emitter, logger, translate } from "@common"
import { Settings } from 'luxon'
import { useAuth } from "@common/composables/auth";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";

const productStore = useProductStore();
const { isAuthenticated } = useAuth();
const userProfile = computed(() => useUserStore().getUserProfile)

const loader = ref(null) as any


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
  if(isAuthenticated.value) {
    const currentProductStore : any = productStore.getCurrentProductStore;
    await Promise.all([
      productStore.fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error)),
      productStore.fetchProductStoreFacilities(currentProductStore.productStoreId).catch((error) => logger.error(error))
    ])
  }
})

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);
})
</script>
