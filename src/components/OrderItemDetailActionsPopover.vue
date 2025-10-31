<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item button :disabled="item.statusId !== 'ITEM_CREATED'" @click="editOrderedQuantity()">
        {{ translate("Edit ordered qty") }}
      </ion-item>
      <ion-item button :disabled="!isEligibleToFulfill()" @click="redirectToFulfillItem()">
        {{ translate("Fulfill") }}
      </ion-item>
      <ion-item button :disabled="!isEligibleToReceive(item)" @click="redirectToReceiveItem()">
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

function isEligibleToFulfill() {
  const excludedStatuses = ["ORDER_CREATED", "ORDER_CANCELLED", "ORDER_REJECTED"];
  return !excludedStatuses.includes(currentOrder.value.statusId);
}

function isEligibleToReceive(item: any) {
  const order = currentOrder.value;

  // Disable if order is created or has Fulfill-Only flow
  if (order.statusId === "ORDER_CREATED" || order.statusFlowId === "TO_Fulfill_Only") return false;

  // Disable if the item is completed
  const orderItem = order.items?.find((orderItem: any) => orderItem.orderItemSeqId === item.orderItemSeqId);
  if (orderItem?.statusId === "ITEM_COMPLETED") return false;

  return true;
}

function redirectToFulfillItem() {
  window.location.href = `${process.env.VUE_APP_FULFILLMENT_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.facilityId}&omsRedirectionUrl=${authStore.oms}`
  popoverController.dismiss()
}

function redirectToReceiveItem() {
  window.location.href = `${process.env.VUE_APP_RECEIVING_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.facilityId}&omsRedirectionUrl=${authStore.oms}`
  popoverController.dismiss()
}
</script>