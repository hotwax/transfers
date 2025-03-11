<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button :disabled="item.statusId !== 'ORDER_CREATED'" @click="editOrderedQuantity()">
        {{ translate("Edit ordered qty") }}
      </ion-item>
      <ion-item button @click="redirectToFulfillItem()">
        {{ translate("Fulfill") }}
      </ion-item>
      <ion-item button :disabled="!getCurrentItemInboundShipment()" @click="redirectToReceiveItem()">
        {{ translate("Receive") }}
      </ion-item>
      <ion-item button lines="none" :disabled="!isEligibleToComplete()" @click="completeItem()">
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
import { useAuthStore } from "@hotwax/dxp-components";

const authStore = useAuthStore()
const productIdentificationStore = useProductIdentificationStore();
const props = defineProps(["item"]);

const getProduct = computed(() => store.getters["product/getProduct"])
const currentOrder = computed(() => store.getters["order/getCurrent"])

async function editOrderedQuantity() {
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
          try {
            const resp = await OrderService.updateOrderItem({
              orderId: props.item.orderId,
              orderItemSeqId: props.item.orderItemSeqId,
              quantity
            })

            if(!hasError(resp)) {
              const order = JSON.parse(JSON.stringify(currentOrder.value));
              order.items.find((item: any) => {
                if(item.orderId === props.item.orderId && item.orderItemSeqId === props.item.orderItemSeqId) {
                  item.quantity = quantity
                  return true;
                }
              })
              store.dispatch("order/updateCurrent", order)
              popoverController.dismiss({ isItemUpdated: true });
              showToast(translate("Item ordered quantity updated successfully."));
            } else {
              throw resp.data;
            }
          } catch(error) {
            logger.error(error);
            showToast(translate("Failed to update item ordered quantity."));
            return false;
          }
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

function isEligibleToComplete() {
  const item = props.item
  if(item?.oiStatusId !== "ITEM_APPROVED") return false;

  if(item.statusFlowId === "RECEIVE_ONLY") {
    return item.receivedQty && item.receivedQty >= item.quantity
  } else {
    return item.shippedQty && item.shippedQty >= item.quantity
  }
}

function getCurrentItemInboundShipment() {
  return currentOrder.value.shipments?.find((shipment: any) => shipment.orderItemSeqId === props.item.orderItemSeqId && shipment.shipmentTypeId === "IN_TRANSFER")
}

function redirectToFulfillItem() {
  window.location.href = `${process.env.VUE_APP_FULFILLMENT_LOGIN_URL}?oms=${authStore.oms}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.facilityId}`
  popoverController.dismiss()
}

function redirectToReceiveItem() {
  const shipment = getCurrentItemInboundShipment()
  window.location.href = `${process.env.VUE_APP_RECEIVING_LOGIN_URL}?oms=${authStore.oms}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&shipmentId=${shipment.shipmentId}&facilityId=${currentOrder.value.facilityId}`
  popoverController.dismiss()
}

async function completeItem() {
  try {
    const resp = await OrderService.changeOrderItemStatus({
      ...props.item,
      statusId: "ITEM_COMPLETED"
    })

    if(!hasError(resp)) {
      const order = JSON.parse(JSON.stringify(currentOrder.value));
      order.items.find((item: any) => {
        if(item.orderId === props.item.orderId && item.orderItemSeqId === props.item.orderItemSeqId) {
          item.oiStatusId = "ITEM_COMPLETED"
          return true;
        }
      })
      await store.dispatch("order/updateCurrent", order)
      popoverController.dismiss({ isItemUpdated: true });
      showToast(translate("Item status updated successfully."));
    } else {
      throw resp.data;
    }
  } catch(error) {
    logger.error(error);
    showToast(translate("Failed to update item status."));
  }
}
</script>