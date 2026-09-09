<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button :aria-label="translate('Close')" @click="modalController.dismiss()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Select order') }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar v-model="query" :placeholder="translate('Search sales orders')" @keyup.enter="searchOrders" />
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <div v-if="isSearching" class="empty-state"><ion-spinner name="crescent" /></div>
    <ion-list v-else-if="orders.length">
      <ion-item v-for="order in orders" :key="order.orderId" button detail="false" @click="selectOrder(order)">
        <ion-label>{{ order.orderName || order.orderId }}<p>{{ order.orderId }}</p></ion-label>
      </ion-item>
    </ion-list>
    <div v-else class="empty-state"><p>{{ translate('No orders found') }}</p></div>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonSearchbar, IonSpinner, IonTitle, IonToolbar, modalController,
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { api, translate } from '@common';

const query = ref('');
const orders = ref<any[]>([]);
const isSearching = ref(false);

function responseOrders(data: any) {
  return Array.isArray(data) ? data : data?.orders ?? data?.docs ?? [];
}

async function searchOrders() {
  const value = query.value.trim();
  if (!value) return;
  isSearching.value = true;
  try {
    const response: any = await api({
      url: 'oms/orders',
      method: 'GET',
      params: { orderId: value, orderId_op: 'contains', orderTypeId: 'SALES_ORDER', pageSize: 20 },
    });
    orders.value = responseOrders(response.data);
  } finally {
    isSearching.value = false;
  }
}

function selectOrder(order: any) {
  modalController.dismiss({ orderId: order.orderId }, 'confirm');
}
</script>

<style scoped>.empty-state { display: grid; min-height: 12rem; place-items: center; }</style>
