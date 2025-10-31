<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button :disabled="item.statusId !== 'ITEM_CREATED'" @click="editOrderedQuantity()">
        {{ translate("Edit ordered qty") }}
      </ion-item>
      <ion-item button :disabled="!isEligibleToFulfill(item)" @click="redirectToFulfillItem()">
        {{ translate("Fulfill") }}
      </ion-item>
      <ion-item button :disabled="!getCurrentItemInboundShipment()" @click="redirectToReceiveItem()">
        {{ translate("Receive") }}
      </ion-item>
      <!--
      TODO: Need to identify real workflow around the item completion for different transfer orders (fulfillment only, fulfill and receive and receive only)
      <ion-item button lines="none" :disabled="!isEligibleToComplete()" @click="completeItem()">
        {{ translate("Complete item") }}
      </ion-item>-->
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
const getOmsBaseUrl = computed(() => store.getters["user/getOmsBaseUrl"])

async function editOrderedQuantity() {
  const alert = await alertController.create({
    header: translate("Edit ordered qty"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Save"),
      handler: async (data: any) => {
        const quantity = Number(data.quantity);
        if(!quantity || quantity < 0) {
          showToast(translate("Please enter a valid quantity."))
          return false;
        }
        if(quantity !== props.item.quantity) {
          try {
            const resp = await OrderService.updateOrderItem({
              orderId: currentOrder.value.orderId,
              orderItemSeqId: props.item.orderItemSeqId,
              unitPrice: props.item.unitPrice || 0,
              quantity
            })

            if(!hasError(resp)) {
              const order = JSON.parse(JSON.stringify(currentOrder.value));
              order.items.find((item: any) => {
                if(item.orderItemSeqId === props.item.orderItemSeqId) {
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

// Determines if a transfer order item is eligible for fulfillment
function isEligibleToFulfill(item: any) {
  const excludedItemStatuses = ["ITEM_PENDING_RECEIPT", "ITEM_COMPLETED"];
  const order = currentOrder.value;

  // Disable if order is in CREATED state or has RECEIVE_ONLY flow
  if (order.statusId === "ORDER_CREATED" || order.statusFlowId === "TO_Receive_Only") return false;

  // Disable if the item is in PENDING_RECEIPT or COMPLETED state
  const orderItem = order.items?.find((orderItem: any) => orderItem.orderItemSeqId === item.orderItemSeqId);
  if (orderItem && excludedItemStatuses.includes(orderItem.statusId)) return false;

  return true;
}

function getCurrentItemInboundShipment() {
  return currentOrder.value.shipments?.find((shipment: any) => shipment.shipmentTypeId === "IN_TRANSFER" && shipment.items?.some((item: any) => item.orderItemSeqId === props.item.orderItemSeqId));
}

function redirectToFulfillItem() {
  window.location.href = `${process.env.VUE_APP_FULFILLMENT_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.facilityId}&omsRedirectionUrl=${authStore.oms}`
  popoverController.dismiss()
}

function redirectToReceiveItem() {
  const shipment = getCurrentItemInboundShipment()
  window.location.href = `${process.env.VUE_APP_RECEIVING_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&shipmentId=${shipment.shipmentId}&facilityId=${currentOrder.value.facilityId}&omsRedirectionUrl=${authStore.oms}`
  popoverController.dismiss()
}
</script>