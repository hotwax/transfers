<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button @click="editOrderedQuantity()">
        {{ translate("Edit ordered qty") }}
      </ion-item>
      <ion-item button>
        {{ translate("Fulfill") }}
      </ion-item>
      <ion-item button>
        {{ translate("Receive") }}
      </ion-item>
      <ion-item button lines="none" :disabled="item.statusId === 'ITEM_COMPLETED'" @click="completeItem()">
        {{ translate("Complete item") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, alertController, popoverController } from "@ionic/vue"
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed, defineProps } from "vue";
import store from "@/store";
import { OrderService } from "@/services/OrderService";
import logger from "@/logger";
import { hasError } from "@/adapter";
import { showToast } from "@/utils";

const productIdentificationStore = useProductIdentificationStore();
const props = defineProps(["item"]);

const getProduct = computed(() => store.getters["product/getProduct"])
const currentOrder = computed(() => store.getters["order/getCurrent"])

async function editOrderedQuantity() {
  console.log(props.item);

  const alert = await alertController.create({
    header: translate("Edit ordered qty"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Save"),
      handler: async (data: any) => {
        if(!data?.quantity) return false;
        const quantity = Number(data.quantity);
        if(quantity !== props.item.quantity) {
          const isUpdated = await updateOrderItem({ quantity })
          showToast(translate(isUpdated ? "Item ordered quantity updated successfully." : "Failed to updated item ordered quantity."))
        }
      }
    }],
    inputs: [{
      name: "quantity",
      placeholder: translate("ordered quantity"),
      value: props.item.quantity,
      min: 0,
      type: "number"
    }]
  })
  

  alert.present()
}

async function updateOrderItem(payload: any) {
  try {
    const resp = await OrderService.updateOrderItem({
      ...props.item,
      ...payload
    })

    if(!hasError(resp)) {
      const order = JSON.parse(JSON.stringify(currentOrder.value));
      order.items.map((item: any) => {
        if(item.orderId === props.item.orderId && item.orderItemSeqId === props.item.orderItemSeqId) {
          if(payload.statusId) {
            item.statusId = "ITEM_COMPLETED"
            store.dispatch('util/fetchStatusDesc', ["ITEM_COMPLETED"])
          } else {
            item.quantity = payload?.quantity
          }
        }
      })
      store.dispatch("order/updateCurrent", order)
      popoverController.dismiss({ dismissed: true, isItemUpdated: true });
      return true;
    } else {
      throw resp.data
    }
  } catch(error) {
    logger.error(error)
  }
  return false;
}

async function completeItem() {
  const isUpdated = await updateOrderItem({ statusId: "ITEM_COMPLETED" })
  showToast(translate(isUpdated ? "Item status updated successfully." : "Failed to update item status."))
}
</script>