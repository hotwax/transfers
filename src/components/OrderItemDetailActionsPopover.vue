<template>
  <ion-content>
    <ion-list>
      <ion-list-header data-testid="order-item-detail-popover-header">{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item v-for="action in OrderActionValidator.getItemActions(currentOrder, item)" :key="action.id" button :color="action.color" @click="handleItemAction(action.id)" :data-testid="`order-item-detail-action-${action.id.replace(/_/g,'-').toLowerCase()}`">
        {{ translate(action.label) }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, alertController, popoverController } from "@ionic/vue"
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { computed } from "vue";
import logger from "@/logger";
import { hasError } from "@/adapter";
import { showToast } from "@/utils";
import { useAuthStore } from "@hotwax/dxp-components";
import { OrderActionValidator, OrderItemActionId } from "@/utils/OrderActionValidator";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useUserStore } from "@/store/user";

const authStore = useAuthStore()
const productIdentificationStore = useProductIdentificationStore();
const props = defineProps(["item"]);
const orderStore = useOrderStore();
const productStore = useProductStore();
const userStore = useUserStore();

const getProduct = computed(() => productStore.getProduct)
const currentOrder = computed(() => orderStore.getCurrent)
const getOmsBaseUrl = computed(() => userStore.getOmsBaseUrl)

function handleItemAction(actionId: OrderItemActionId) {
  switch (actionId) {
    case 'EDIT':
      editOrderedQuantity();
      break;
    case 'FULFILL':
      redirectToFulfillItem();
      break;
    case 'RECEIVE':
      redirectToReceiveItem();
      break;
    case 'CLOSE_FULFILLMENT':
      closeFulfillment();
      break;
    case 'REMOVE':
      removeOrderItem();
      break;
    case 'APPROVE':
      updateItemStatus('ITEM_APPROVED', 'Approve Item');
      break;
    case 'CANCEL':
      updateItemStatus('ITEM_CANCELLED', 'Cancel Item');
      break;
  }
}

async function removeOrderItem() {
  const alert = await alertController.create({
    header: translate("Remove item"),
    message: translate("Are you sure you want to remove this item?"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Confirm"),
      handler: async () => {
        try {
          await orderStore.cancelOrderItem(currentOrder.value.orderId, props.item.orderItemSeqId, false)

          const order = JSON.parse(JSON.stringify(currentOrder.value));
          const item = order.items.find((item: any) => item.orderItemSeqId === props.item.orderItemSeqId);
          if (item) item.statusId = "ITEM_CANCELLED";
          orderStore.updateCurrent(order)
          popoverController.dismiss({ isItemUpdated: true });
          showToast(translate("Item removed successfully."));
        } catch (error) {
          logger.error(error);
          showToast(translate("Failed to remove item."));
        }
      }
    }]
  });
  await alert.present();
}

async function updateItemStatus(statusId: string, header: string) {
  const alert = await alertController.create({
    header: translate(header),
    message: translate(`Are you sure you want to ${header.toLowerCase()}?`),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Confirm"),
      handler: async () => {
        try {
          const resp = await orderStore.updateOrderItem({
            orderId: currentOrder.value.orderId,
            orderItemSeqId: props.item.orderItemSeqId,
            statusId
          })

          if (!hasError(resp)) {
            showToast(translate("Item status updated successfully."));
            popoverController.dismiss({ isItemUpdated: true });
          } else {
            throw resp.data;
          }
        } catch (error) {
          logger.error(error);
          showToast(translate("Failed to update item status."));
        }
      }
    }]
  });
  alert.present();
}

async function editOrderedQuantity() {
  let isUpdatingQuantity = false;
  const alert = await alertController.create({
    header: translate("Edit ordered qty"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Save"),
      handler: async (data: any) => {
        // Prevent multiple API calls
        if (isUpdatingQuantity) return false;
        isUpdatingQuantity = true;

        const quantity = Number(data.quantity);
        if(!quantity || quantity < 0) {
          showToast(translate("Please enter a valid quantity."))
          isUpdatingQuantity = false
          return false;
        }
        if(quantity !== props.item.quantity) {
          try {
            const resp = await orderStore.updateOrderItem({
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
              orderStore.updateCurrent(order)
              popoverController.dismiss({ isItemUpdated: true });
              showToast(translate("Item ordered quantity updated successfully."));
            } else {
              throw resp.data;
            }
          } catch(error) {
            logger.error(error);
            showToast(translate("Failed to update item ordered quantity."));
            return false;
          } finally {
            isUpdatingQuantity = false;
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

async function closeFulfillment() {
  const alert = await alertController.create({
    header: translate(props.item.totalIssuedQuantity > 0 ? "Close Fulfillment" : "Cancel Item"),
    message: translate(props.item.totalIssuedQuantity > 0 ? "This will cancel the remaining unfulfilled quantity and release reservations. This action cannot be reverted. Are you sure you want to proceed?" : "Are you sure you want to remove this item?"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Confirm"),
      handler: async () => {
        try {
          const resp = await orderStore.closeFulfillment({
            orderId: currentOrder.value.orderId,
            items: [{
              orderItemSeqId: props.item.orderItemSeqId
            }]
          })

          if (!hasError(resp)) {
            showToast(translate("Fulfillment closed successfully."));
            popoverController.dismiss({ isItemUpdated: true });
          } else {
            throw resp.data;
          }
        } catch (error) {
          logger.error(error);
          showToast(translate("Failed to close fulfillment."));
        }
      }
    }]
  });
  alert.present();
}

function redirectToFulfillItem() {
  window.location.href = `${process.env.VUE_APP_FULFILLMENT_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.facilityId}&omsRedirectionUrl=${authStore.oms}`
  popoverController.dismiss()
}

function redirectToReceiveItem() {
  window.location.href = `${process.env.VUE_APP_RECEIVING_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${authStore.token.value}&expirationTime=${authStore.token.expiration}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.orderFacilityId}&omsRedirectionUrl=${authStore.oms}`
  popoverController.dismiss()
}
</script>
