<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item lines="none">
          <ion-label>
            <h1>{{ translate("Location") }}</h1>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Product Store')" interface="popover" :value="query.productStore" @ionChange="updateAppliedFilters($event['detail'].value, 'productStore')">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="store in productStoreOptions" :key="store" :value="store">{{ store }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Origin')" interface="popover" :value="query.originFacility" @ionChange="updateAppliedFilters($event['detail'].value, 'originFacility')">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="facility in originFacilityOptions" :key="facility" :value="facility">{{ facility }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Destination')" interface="popover" :value="query.destinationFacility" @ionChange="updateAppliedFilters($event['detail'].value, 'destinationFacility')">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="facility in destinationFacilityOptions" :key="facility" :value="facility">{{ facility }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item lines="none">
          <ion-label>
            <h1>{{ translate("Fulfillment") }}</h1>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Method')" interface="popover" :value="query.shipmentMethodTypeId" @ionChange="updateAppliedFilters($event['detail'].value, 'shipmentMethodTypeId')">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="method in shipmentMethodOptions" :key="method" :value="method">{{ method }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Carrier')" interface="popover" :value="query.carrierPartyId" @ionChange="updateAppliedFilters($event['detail'].value, 'carrierPartyId')">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="carrier in carrierOptions" :key="carrier" :value="carrier">{{ carrier }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Status')" interface="popover" :value="query.status" @ionChange="updateAppliedFilters($event['detail'].value, 'status')">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="status in orderStatuses" :key="status" :value="status">{{ status }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </ion-content> 
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent,IonHeader, IonItem, IonLabel, IonList, IonMenu, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { translate } from "@hotwax/dxp-components";
import { computed } from "vue";
import store from "@/store";

const query = computed(() => store.getters["order/getQuery"])
const productStoreOptions = computed(() => store.getters["order/getProductStoreOptions"])
const originFacilityOptions = computed(() => store.getters["order/getOriginFacilityOptions"])
const destinationFacilityOptions = computed(() => store.getters["order/getDestinationFacilityOptions"])
const orderStatuses = computed(() => store.getters["order/getOrderStatuses"])
const shipmentMethodOptions = computed(() => store.getters["order/getShipmentMethodOptions"])
const carrierOptions = computed(() => store.getters["order/getCarrierOptions"])

async function updateAppliedFilters(value: string | boolean, filterName: string) {
  await store.dispatch('order/updateAppliedFilters', { value, filterName })
}
</script>