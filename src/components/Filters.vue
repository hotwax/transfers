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
          <ion-select :label="translate('Product Store')" interface="popover" value="">
            <ion-select-option value="">Notnaked</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Origin')" interface="popover" value="">
            <ion-select-option value="">California Warehouse</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Destination')" interface="popover" value="">
            <ion-select-option value="">Irvine Spectrum</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item lines="none">
          <ion-label>
            <h1>{{ translate("Fulfillment") }}</h1>
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Method')" interface="popover" value="">
            <ion-select-option value="">{{ "All" }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Carrier')" interface="popover" value="">
            <ion-select-option value="">{{ "All" }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Status')" interface="popover" value="">
            <ion-select-option value="">{{ "All" }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>
    </ion-content> 
  </ion-menu>
</template>

<script setup lang="ts">
import { IonContent,IonHeader, IonItem, IonLabel, IonList, IonMenu, IonSelect, IonSelectOption, IonTitle, IonToolbar } from "@ionic/vue";
import { translate } from "@hotwax/dxp-components";
</script>