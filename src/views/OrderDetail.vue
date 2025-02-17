<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/tabs/transfers`" />
        <ion-title>{{ translate("Transfer order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main v-if="isFetchingOrderDetail">
        <div class="empty-state">
          <ion-spinner name="crescent" />
          <ion-label>{{ translate("Fetching order details") }}</ion-label>
        </div>
      </main>
      <main v-else>
        <section class="header">
          <div class="id">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="ticketOutline" />
              <ion-label>
                <h1>{{ currentOrder.orderName }}</h1>
              </ion-label>
              <ion-badge slot="end">{{ getStatusDesc(currentOrder.statusId) ? getStatusDesc(currentOrder.statusId) : currentOrder.statusId }}</ion-badge>
            </ion-item>
          </div>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ currentOrder.originFacility?.facilityName }}</ion-card-title>
              </ion-card-header>
              <ion-item lines="none">
                <ion-icon :icon="sendOutline" slot="start" />
                <ion-label>
                  <h3>{{ currentOrder.originFacility?.address1 }}</h3>
                  <h3>{{ currentOrder.originFacility?.address2 }}</h3>
                  <p>{{ `${currentOrder.originFacility?.city}, ${currentOrder.originFacility?.postalCode}` }}</p>
                  <p>{{ `${currentOrder.originFacility?.stateGeoName}, ${currentOrder.originFacility?.countryGeoName}` }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-select :label="translate('Carrier')" v-model="currentOrder.carrierPartyId" interface="popover">
                  <ion-select-option :value="carrierPartyId" v-for="(carrierPartyId, index) in Object.keys(shipmentMethodsByCarrier)" :key="index">{{ getCarrierDesc(carrierPartyId) }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item lines="none">
                <ion-select :label="translate('Method')" v-model="currentOrder.shipmentMethodTypeId" v-if="getCarrierShipmentMethods()?.length" interface="popover">
                  <ion-select-option :value="shipmentMethod.shipmentMethodTypeId" v-for="(shipmentMethod, index) in getCarrierShipmentMethods()" :key="index">{{ shipmentMethod.description ? shipmentMethod.description : shipmentMethod.shipmentMethodTypeId }}</ion-select-option>
                </ion-select>
                <template v-else>
                  <ion-icon :icon="informationCircleOutline" slot="start" />
                  <ion-label>{{ "No shipment methods found" }}</ion-label>
                </template>
              </ion-item>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ currentOrder.destinationFacility?.facilityName }}</ion-card-title>
              </ion-card-header>
              <ion-item lines="none">
                <ion-icon :icon="downloadOutline" slot="start" />
                <ion-label>
                  <h3>{{ currentOrder.destinationFacility?.address1 }}</h3>
                  <h3>{{ currentOrder.destinationFacility?.address2 }}</h3>
                  <p>{{ `${currentOrder.destinationFacility?.city}, ${currentOrder.destinationFacility?.postalCode}` }}</p>
                  <p>{{ `${currentOrder.destinationFacility?.stateGeoName}, ${currentOrder.destinationFacility?.countryGeoName}` }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </div>

          <div class="timeline">
            <ion-list class="desktop-only">
              <ion-item>
                <ion-icon :icon="sunnyOutline" slot="start" />
                <ion-label>
                  {{ translate("Created") }}
                </ion-label>
                <ion-note slot="end">{{ "1:07pm 6th Dec 2024" }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-icon :icon="checkmarkDoneOutline" slot="start" />
                <ion-label>
                  <p class="overline">+10 minutes</p>
                  {{ translate("Approved for fulfillment") }}
                </ion-label>
                <ion-note slot="end">{{ "1:07pm 6th Dec 2024" }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-icon :icon="sendOutline" slot="start" />
                <ion-label>
                  <p class="overline">+2 hours 6 minutes</p>
                  {{ "4 items shipped" }}
                </ion-label>
                <ion-note slot="end">{{ "1:07pm 6th Dec 2024" }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-icon :icon="downloadOutline" slot="start" />
                <ion-label>
                  <p class="overline">+4 days</p>
                  {{ "4 items received" }}
                </ion-label>
                <ion-note slot="end">{{ "1:07pm 6th Dec 2024" }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-icon :icon="shirtOutline" slot="start" />
                <ion-label>
                  <p class="overline">+20 minutes</p>
                  {{ "<SKU> added" }}
                </ion-label>
                <ion-button fill="clear" slot="end" color="medium">
                  <ion-icon :icon="informationCircleOutline" slot="icon-only" />
                </ion-button>
              </ion-item>
            </ion-list>
          </div>
        </section>

        <section class="header" v-if="currentOrder.shipments?.length">
          <ion-radio-group v-model="selectedShipmentId" @ionChange="generateItemsListByParent()">
            <div class="info">
              <ion-card v-if="getFilteredShipments('OUT_TRANSFER')?.length">
                <ion-card-header>
                  <ion-card-title>{{ translate("Fulfillment") }}</ion-card-title>
                </ion-card-header>
                <ion-item v-for="(shipment, index) in getFilteredShipments('OUT_TRANSFER')" :key="index">
                  <ion-radio :value="shipment.shipmentId">
                    <ion-label>
                      {{ shipment.shipmentId }}
                      <p v-if="shipment.trackingCode">{{ shipment.trackingCode }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-card>
              
              <ion-card v-if="getFilteredShipments('IN_TRANSFER')?.length">
                <ion-card-header>
                  <ion-card-title>{{ translate("Receipts") }}</ion-card-title>
                </ion-card-header>
                <ion-item v-for="(shipment, index) in getFilteredShipments('IN_TRANSFER')" :key="index">
                  <ion-radio :value="shipment.shipmentId">
                    <ion-label>
                      {{ shipment.shipmentId }}
                      <p v-if="shipment.trackingCode">{{ shipment.trackingCode }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-card>
            </div>
          </ion-radio-group>
          <div class="timeline" v-if="selectedShipmentId">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Shipment details") }}</ion-card-title>
                <ion-button fill="clear" color="medium" @click="selectedShipmentId = ''; generateItemsListByParent()">
                  <ion-icon :icon="closeCircleOutline" slot="icon-only" />
                </ion-button>
              </ion-card-header>
              <ion-item>
                <ion-label>{{ translate("Shipped date") }}</ion-label>
                <ion-label slot="end">{{ "-" }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Method") }}</ion-label>
                <ion-label slot="end">{{ getSelectedShipment()?.shipmentMethodTypeId }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Carrier") }}</ion-label>
                <ion-label slot="end">{{ getSelectedShipment()?.carrierPartyId }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label>{{ translate("Tracking code") }}</ion-label>
                <ion-label slot="end">{{ getSelectedShipment()?.trackingCode || "-" }}</ion-label>
              </ion-item>
            </ion-card>
          </div>
        </section>

        <section class="ion-margin-top">
          <div>
            <ion-item lines="none">
              <ion-icon slot="start" :icon="shirtOutline" />
              <ion-label>
                <h1>{{ "Items" }}</h1>
                <p>{{ "Showing items for selected shipment" }}</p>
              </ion-label>
              <ion-button size="default" fill="outline" color="medium">
                {{ translate("Add item to transfer") }}
              </ion-button>
            </ion-item>

            <hr />

            <template v-for="([parentProductId, items], index) in Object.entries(itemsByParentProductId)" :key="index">
              <template v-if="items.length">
                <div class="list-item">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <Image :src="getProduct(items[0]?.productId)?.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      {{ parentProductNamesById[parentProductId] }}
                      <p class="overline">{{ parentProductId }}</p>
                    </ion-label>
                  </ion-item>
                  <div></div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ "-" }}
                      <p>{{ translate("ordered") }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ "-" }}
                      <p>{{ translate("shipped") }}</p>
                    </ion-label>
                  </div>
                  <div></div>
                  <ion-item lines="none" slot="end" class="ion-text-center">
                    <ion-label>
                      {{ "-" }}
                      <p>{{ translate("received") }}</p>
                    </ion-label>
                  </ion-item>
                </div>
    
                <div class="list-item" v-for="(item, index) in items" :key="index">
                  <ion-item lines="none">
                    <ion-label class="ion-text-wrap">
                      {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                      <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    </ion-label>
                  </ion-item>
                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ item.quantity }}
                      <p>{{ translate("ordered") }}</p>
                    </ion-label>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-chip outline>
                      <ion-icon slot="start" :icon="sendOutline" />
                      <ion-label>{{ "-" }}</ion-label>
                    </ion-chip>
                  </div>
                  <div class="tablet ion-text-center">
                    <ion-chip outline>
                      <ion-icon slot="start" :icon="downloadOutline" />
                      <ion-label>{{ "-" }}</ion-label>
                    </ion-chip>
                  </div>
                  <ion-badge color="success">{{ getStatusDesc(item.statusId) ? getStatusDesc(item.statusId) : item.statusId }}</ion-badge>
                  <ion-button slot="end" fill="clear" color="medium" @click="openOrderItemDetailActionsPopover($event, item)">
                    <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
                  </ion-button>
                </div>
              </template>
              <hr />
            </template>
          </div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton,IonBadge, IonButton, IonCard, IonCardHeader, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRadio, IonRadioGroup, IonSelect, IonSelectOption, IonSpinner, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter, popoverController } from "@ionic/vue";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { ellipsisVerticalOutline, ticketOutline, sunnyOutline, checkmarkDoneOutline, downloadOutline, sendOutline, shirtOutline, informationCircleOutline, closeCircleOutline } from "ionicons/icons";
import Image from "@/components/Image.vue";
import OrderItemDetailActionsPopover from '@/components/OrderItemDetailActionsPopover.vue';
import { computed, defineProps, ref } from "vue";
import { useStore } from "vuex";
import emitter from "@/event-bus";

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();
const props = defineProps(["orderId"]);

const currentOrder = computed(() => store.getters["order/getCurrent"])
const getStatusDesc = computed(() => store.getters["util/getStatusDesc"])
const shipmentMethodsByCarrier = computed(() => store.getters["util/getShipmentMethodsByCarrier"])
const getProduct = computed(() => store.getters["product/getProduct"])
const getCarrierDesc = computed(() => store.getters["util/getCarrierDesc"])

const isFetchingOrderDetail = ref(false);
const selectedShipmentId = ref("");
const itemsByParentProductId = ref({}) as any;
const parentProductNamesById = ref({}) as any;

onIonViewWillEnter(async () => {
  
  isFetchingOrderDetail.value = true;
  await store.dispatch("order/fetchOrderDetails", props.orderId)
  if(currentOrder.value.statusId !== "ORDER_CREATED") await store.dispatch("order/fetchOrderShipments", props.orderId)
  generateItemsListByParent();
  await store.dispatch("util/fetchCarriersDetail");
  isFetchingOrderDetail.value = false;
})

function getFilteredShipments(shipmentTypeId: string) {
  return currentOrder.value.shipments?.filter((shipment: any) => shipment.shipmentTypeId === shipmentTypeId); 
}

function generateItemsListByParent() {
  const itemsById = {} as any;

  let itemsList = [];
  if(selectedShipmentId.value) {
    const shipment = currentOrder.value.shipments.find((shipment: any) => shipment.shipmentId === selectedShipmentId.value);
    itemsList = shipment.items
  } else {
    itemsList = currentOrder.value.items
  }

  itemsList?.map((item: any) => {
    const product = getProduct.value(item.productId)
    if(itemsById[product.groupId]) {
      itemsById[product.groupId].push(item)
    } else {
      itemsById[product.groupId] = [item]
    }
    parentProductNamesById.value[product.groupId] = product.parentProductName
  })
  itemsByParentProductId.value = itemsById
}

function getSelectedShipment() {
  return currentOrder.value.shipments.find((shipment: any) => shipment.shipmentId === selectedShipmentId.value)
}

function getCarrierShipmentMethods() {
  return currentOrder.value.carrierPartyId && shipmentMethodsByCarrier.value[currentOrder.value.carrierPartyId]
}

async function openOrderItemDetailActionsPopover(event: any, item: any){
  const popover = await popoverController.create({
    component: OrderItemDetailActionsPopover,
    componentProps: { item },
    event,
    showBackdrop: false,
  });

  popover.onDidDismiss().then((result) => {
    if(result.data?.isItemUpdated) generateItemsListByParent()
  })

  await popover.present();
}
</script>

<style scoped>
.id {
  grid-area: id;
}

.info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(314px, 1fr));
  align-items: start;
  grid-area: cards;
}

.timeline {
  grid-area: timeline;
}

.list-item {
  --columns-desktop: 6;
}

.list-item > ion-item {
  width: 100%;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

@media (min-width: 991px) {
  .header {
    display: grid;
    grid: "id timeline" min-content
          "cards timeline" 1fr
          / 1fr 500px;
    justify-content: space-between;  
  }
}
</style>
