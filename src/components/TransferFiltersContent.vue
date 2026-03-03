<template>
  <ion-list>
    <ion-item lines="none">
      <ion-label>
        <h1>{{ translate("Location") }}</h1>
      </ion-label>
    </ion-item>
    <ion-item lines="none">
      <ion-select :label="translate('Product Store')" interface="popover" :value="query.productStoreId" @ionChange="updateAppliedFilters($event['detail'].value, 'productStoreId')">
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="store in productStores" :key="store.productStoreId" :value="store.productStoreId">{{ store.storeName ? store.storeName : store.productStoreId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none">
      <ion-select :label="translate('Origin')" interface="popover" :value="query.facilityId" @ionChange="updateAppliedFilters($event['detail'].value, 'facilityId')">
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName ? facility.facilityName : facility.facilityId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none">
      <ion-select :label="translate('Destination')" interface="popover" :value="query.orderFacilityId" @ionChange="updateAppliedFilters($event['detail'].value, 'orderFacilityId')">
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName ? facility.facilityName : facility.facilityId }}</ion-select-option>
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
        <ion-select-option v-for="(shipmentMethodTypeDesc, shipmentMethodTypeId) in shipmentMethods" :key="shipmentMethodTypeId" :value="shipmentMethodTypeId">{{ shipmentMethodTypeDesc ? shipmentMethodTypeDesc : shipmentMethodTypeId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none">
      <ion-select :label="translate('Carrier')" interface="popover" :value="query.carrierPartyId" @ionChange="updateAppliedFilters($event['detail'].value, 'carrierPartyId')">
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="(carrierDesc, carrierPartyId) in carriersList" :key="carrierPartyId" :value="carrierPartyId">{{ carrierDesc ? carrierDesc : carrierPartyId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none">
      <ion-select :label="translate('Type')" interface="popover" :value="query.statusFlowId" @ionChange="updateAppliedFilters($event['detail'].value, 'statusFlowId')">
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="flow in statusFlows" :key="flow.statusFlowId" :value="flow.statusFlowId">{{ translate(flow.description) }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none">
      <ion-select :label="translate('Status')" interface="popover" :value="query.orderStatusId" @ionChange="updateAppliedFilters($event['detail'].value, 'orderStatusId')">
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="statusId in orderStatusIds" :key="statusId" :value="statusId">{{ getStatusDesc(statusId) }}</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonSelect, IonSelectOption } from '@ionic/vue';
import { translate, useUserStore } from '@hotwax/dxp-components'
import { useStore } from 'vuex';
import { computed, onMounted, ref } from "vue";
import { hasError } from "@/adapter";
import { UtilService } from '@/services/UtilService';
import logger from '@/logger';

const props = defineProps(['groupByConfig']);

const store = useStore();
const userStore = useUserStore();

const productStores = ref({}) as any;
const facilities = ref([]) as any;
const orderStatusIds = ["ORDER_APPROVED", "ORDER_CANCELLED", "ORDER_COMPLETED", "ORDER_CREATED"];
const statusFlows = [
  {
    statusFlowId: "TO_Fulfill_And_Receive",
    description: "Fulfill & Receive"
  },
  {
    statusFlowId: "TO_Fulfill_Only",
    description: "Fulfill only"
  },
  {
    statusFlowId: "TO_Receive_Only",
    description: "Receive only"
  }
]

const query = computed(() => store.getters["order/getQuery"])
const getStatusDesc = computed(() => store.getters["util/getStatusDesc"])
const shipmentMethods = computed(() => store.getters["util/getShipmentMethods"])
const carriersList = computed(() => store.getters["util/getCarriers"])

onMounted(async () => {
  await fetchFacilities();
  productStores.value = await userStore.getEComStores();
})

async function fetchFacilities() {
  let pageIndex = 0, resp
  try {
    do {
      resp = await UtilService.fetchFacilities({
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y",
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        pageSize: 100,
        pageIndex
      });

      if (!hasError(resp)) {
        if (resp.data.length) {
          facilities.value = facilities.value.concat(resp.data);
        }
      } else {
        throw resp.data;
      }
      pageIndex++;
    } while (resp.data.length >= 100);
  } catch (error) {
    logger.error(error);
  }
}

async function updateAppliedFilters(value: string | boolean, filterName: string) {
  await store.dispatch('order/updateOrdersList', { orders: [], ordersCount: 0 })
  await store.dispatch('order/updateAppliedFilters', { value, filterName, groupByConfig: props.groupByConfig })
}
</script>
