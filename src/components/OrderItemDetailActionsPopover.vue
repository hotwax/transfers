<template>
  <ion-content>
    <ion-list>
      <ion-list-header data-testid="order-item-detail-popover-header">{{ commonUtil.getProductIdentificationValue(useProductStore().getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item v-for="action in OrderActionValidator.getItemActions(currentOrder, item)" :key="action.id" button :color="action.color" @click="handleItemAction(action.id)" :data-testid="`order-item-detail-action-${action.id.replace(/_/g,'-').toLowerCase()}`">
        {{ translate(action.label) }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, IonListHeader, alertController, popoverController } from "@ionic/vue"
import { computed } from "vue";
import { logger, translate, commonUtil, cookieHelper } from "@common";
import { OrderActionValidator, OrderItemActionId } from "@/utils/OrderActionValidator";
import { useOrderStore } from "@/store/order";
import { useProductStore as useProduct } from "@/store/product";
import { useProductStore } from "@/store/productStore";

const props = defineProps(["item"]);
const orderStore = useOrderStore();

const getProduct = computed(() => useProduct().getProduct)
const currentOrder = computed(() => orderStore.getCurrent)
const getOmsBaseUrl = computed(() => commonUtil.getOmsURL().replace('/api/', '/'))
const oms = cookieHelper().get("oms");
const token = cookieHelper().get("token");
const expirationTime = Number(cookieHelper().get("expirationTime"));


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
          commonUtil.showToast(translate("Item removed successfully."), { position: 'top' });
        } catch (error) {
          logger.error(error);
          commonUtil.showToast(translate("Failed to remove item."), { position: 'top' });
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

          if (!commonUtil.hasError(resp)) {
            commonUtil.showToast(translate("Item status updated successfully."), { position: 'top' });
            popoverController.dismiss({ isItemUpdated: true });
          } else {
            throw resp.data;
          }
        } catch (error) {
          logger.error(error);
          commonUtil.showToast(translate("Failed to update item status."), { position: 'top' });
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
          commonUtil.showToast(translate("Please enter a valid quantity."), { position: 'top' })
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

            if(!commonUtil.hasError(resp)) {
              const order = JSON.parse(JSON.stringify(currentOrder.value));
              order.items.find((item: any) => {
                if(item.orderItemSeqId === props.item.orderItemSeqId) {
                  item.quantity = quantity
                  return true;
                }
              })
              orderStore.updateCurrent(order)
              popoverController.dismiss({ isItemUpdated: true });
              commonUtil.showToast(translate("Item ordered quantity updated successfully."), { position: 'top' });
            } else {
              throw resp.data;
            }
          } catch(error) {
            logger.error(error);
            commonUtil.showToast(translate("Failed to update item ordered quantity."), { position: 'top' });
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

          if (!commonUtil.hasError(resp)) {
            commonUtil.showToast(translate("Fulfillment closed successfully."), { position: 'top' });
            popoverController.dismiss({ isItemUpdated: true });
          } else {
            throw resp.data;
          }
        } catch (error) {
          logger.error(error);
          commonUtil.showToast(translate("Failed to close fulfillment."), { position: 'top' });
        }
      }
    }]
  });
  alert.present();
}

    
function redirectToFulfillItem() {
  window.location.href = `${import.meta.env.VITE_FULFILLMENT_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${token}&expirationTime=${expirationTime}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.facilityId}&omsRedirectionUrl=${oms}`
  popoverController.dismiss()
}

function redirectToReceiveItem() {
  window.location.href = `${import.meta.env.VITE_RECEIVING_LOGIN_URL}?oms=${getOmsBaseUrl.value}&token=${token}&expirationTime=${expirationTime}&orderId=${currentOrder.value.orderId}&facilityId=${currentOrder.value.orderFacilityId}&omsRedirectionUrl=${oms}`
  popoverController.dismiss()
}
</script>
