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
            <h1>{{ translate("Type") }}</h1>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Discrepancy Type')" interface="popover" :value="selectedTab" @ionChange="$emit('update:selectedTab', $event.detail.value)">
            <ion-select-option value="TransferOrderOverReceived">{{ translate("Over") }}</ion-select-option>
            <ion-select-option value="TransferOrderUnderReceived">{{ translate("Under") }}</ion-select-option>
            <ion-select-option value="TransferOrderMisshipped">{{ translate("Mis-shipped") }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item lines="none">
          <ion-label>
            <h1>{{ translate("Location") }}</h1>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Origin')" interface="popover" :value="originFacilityId" @ionChange="$emit('update:originFacilityId', $event.detail.value)">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
              {{ facility.facilityName || facility.facilityId }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Destination')" interface="popover" :value="destinationFacilityId" @ionChange="$emit('update:destinationFacilityId', $event.detail.value)">
            <ion-select-option value="">{{ translate("All") }}</ion-select-option>
            <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
              {{ facility.facilityName || facility.facilityId }}
            </ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenu, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { translate } from "@hotwax/dxp-components";

defineProps({
  selectedTab: String,
  originFacilityId: String,
  destinationFacilityId: String,
  facilities: Array as any
});

defineEmits(['update:selectedTab', 'update:originFacilityId', 'update:destinationFacilityId']);
</script>
