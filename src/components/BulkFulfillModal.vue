<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="bulk-fulfill-close-btn" :disabled="isProcessing" @click="requestClose">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Bulk Fulfill") }}</ion-title>
    </ion-toolbar>
    <ion-progress-bar data-testid="bulk-fulfill-step-progress" :value="stepProgress"></ion-progress-bar>
  </ion-header>

  <ion-content>
    <!-- STEP: Choose Shipment -->
    <div v-if="step === 'CHOOSE'">
      <div v-if="isLoadingOpen" class="ion-text-center ion-padding">
        <ion-spinner name="crescent" />
        <ion-label><p>{{ translate("Loading open shipments...") }}</p></ion-label>
      </div>

      <template v-else>
        <ion-list data-testid="bulk-fulfill-open-shipments">
          <ion-item
            v-for="s in openShipments"
            :key="s.shipmentId"
            :data-testid="`bulk-fulfill-open-shipment-${s.shipmentId}`"
            button
            detail
            @click="resumeShipment(s)">
            <ion-icon v-if="!s.canShip" slot="start" :icon="warningOutline" color="warning" />
            <ion-label class="ion-text-wrap">
              {{ translate("Shipment") }} {{ s.shipmentId }}
              <p>{{ s.itemCount }} {{ translate("items") }} &nbsp;·&nbsp; {{ s.unitCount }} {{ translate("units") }}</p>
              <p v-if="s.carrierPartyId || s.shipmentMethodTypeId">
                {{ s.carrierPartyId ? getCarrierDesc(s.carrierPartyId) : '' }}
                <span v-if="s.carrierPartyId && s.shipmentMethodTypeId"> · </span>
                {{ s.shipmentMethodTypeId ? methodDesc(s.carrierPartyId, s.shipmentMethodTypeId) : '' }}
              </p>
              <template v-if="!s.canShip">
                <p class="ion-text-wrap" :data-testid="`bulk-fulfill-open-shipment-${s.shipmentId}-overbooked`">
                  <ion-text color="warning">{{ translate("Cannot ship: shipment quantity exceeds pending fulfillment") }}</ion-text>
                </p>
                <p><ion-text color="medium">{{ translate("Cancel shipment to continue") }}</ion-text></p>
              </template>
            </ion-label>
            <ion-note slot="end" v-if="s.createdDate">{{ translate("Created") }} {{ formatDate(s.createdDate) }}</ion-note>
          </ion-item>
        </ion-list>

        <div class="ion-padding">
          <ion-text v-if="eligibleItems.length === 0" color="medium">
            <p class="ion-text-center">{{ translate("No items are available to start a new shipment.") }}</p>
          </ion-text>
        </div>
      </template>
    </div>

    <!-- STEP: Confirm Fulfillment -->
    <div v-else-if="step === 'CONFIRM'">
      <div class="ion-padding">
        <p>{{ translate("You are about to fulfill") }} {{ eligibleItems.length }} {{ translate("items.") }}</p>
        <p>
          {{ eligibleItems.length }} {{ translate("items") }} &nbsp;·&nbsp;
          {{ totalUnits }} {{ translate("units") }}
        </p>
      </div>

      <ion-list>
        <ion-item lines="none">
          <ion-label>
            <p class="overline">{{ translate("Origin facility") }}</p>
            {{ originFacilityLabel }}
          </ion-label>
        </ion-item>

        <ion-item data-testid="bulk-fulfill-skipped-warning" v-if="skippedCount > 0" lines="none" color="warning">
          <ion-icon :icon="informationCircleOutline" slot="start" />
          <ion-label class="ion-text-wrap">
            <p>{{ skippedCount }} {{ translate("selected items cannot be fulfilled and will be skipped.") }}</p>
          </ion-label>
        </ion-item>

        <ion-item data-testid="bulk-fulfill-none-warning" v-if="eligibleItems.length === 0" lines="none" color="warning">
          <ion-icon :icon="informationCircleOutline" slot="start" />
          <ion-label class="ion-text-wrap">
            <p>{{ translate("No items are available for this bulk action.") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </div>

    <!-- STEP: Ship Shipment -->
    <div v-else-if="step === 'SHIP'">
      <template v-if="!canShipCurrent">
        <ion-list data-testid="bulk-fulfill-overbooked-panel">
          <ion-item lines="none" color="warning">
            <ion-icon :icon="warningOutline" slot="start" />
            <ion-label class="ion-text-wrap">
              {{ translate("This shipment cannot be shipped") }}
              <p>{{ translate("It contains more quantity than is currently pending fulfillment.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-for="d in overbookedDiffs" :key="d.orderItemSeqId" lines="full">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ productLabel(d.productId) }}</p>
              <p>{{ translate("Booked") }}: <strong>{{ d.bookedQty }}</strong> &nbsp;·&nbsp; {{ translate("Pending fulfillment") }}: <strong>{{ d.pendingQty }}</strong></p>
            </ion-label>
          </ion-item>
        </ion-list>
        <div v-if="processingMessage" class="ion-text-center ion-padding">
          <ion-label><p>{{ processingMessage }}</p></ion-label>
        </div>
      </template>

      <template v-else>
      <ion-segment data-testid="bulk-fulfill-ship-mode-segment" :value="shipMode" @ionChange="shipMode = $event.detail.value">
        <ion-segment-button data-testid="bulk-fulfill-ship-mode-label" value="LABEL">
          <ion-label>{{ translate("Generate label") }}</ion-label>
        </ion-segment-button>
        <ion-segment-button data-testid="bulk-fulfill-ship-mode-tracking" value="TRACKING">
          <ion-label>{{ translate("Manual tracking") }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <template v-if="shipMode === 'LABEL'">
        <div v-if="isLoadingRates" class="ion-text-center ion-padding">
          <ion-spinner name="crescent" />
          <ion-label><p>{{ translate("Loading...") }}</p></ion-label>
        </div>

        <ion-list v-else-if="shippingRates.length">
          <ion-radio-group data-testid="bulk-fulfill-rate-group" :value="selectedRateKey" @ionChange="selectedRateKey = $event.detail.value">
            <ion-item v-for="(rate, index) in shippingRates" :key="index">
              <ion-radio :data-testid="`bulk-fulfill-rate-radio-${index}`" :value="rateKey(rate)">
                {{ formatCurrency(rate.shippingEstimateAmount, shipmentDetail?.currencyUom) }}
                <p>{{ rateName(rate) }}</p>
                <p v-if="rate.serviceDays">{{ translate("Service Days:") }} {{ rate.serviceDays }}</p>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-list>

        <div v-else class="ion-text-center ion-padding">
          <ion-label><p>{{ translate("No shipping rates found") }}</p></ion-label>
        </div>
      </template>

      <ion-list v-else-if="shipMode === 'TRACKING'">
        <ion-item>
          <ion-select data-testid="bulk-fulfill-carrier-select" :label="translate('Carrier')" :placeholder="translate('Select')" v-model="manual.carrierPartyId" interface="popover">
            <ion-select-option :value="cpid" v-for="cpid in Object.keys(shipmentMethodsByCarrier)" :key="cpid">{{ getCarrierDesc(cpid) }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select data-testid="bulk-fulfill-method-select" :label="translate('Shipping method')" :placeholder="translate('Select')" v-model="manual.shipmentMethodTypeId" interface="popover" :disabled="!manual.carrierPartyId">
            <ion-select-option :value="m.shipmentMethodTypeId" v-for="m in carrierMethods" :key="m.shipmentMethodTypeId">{{ m.description || m.shipmentMethodTypeId }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-input data-testid="bulk-fulfill-tracking-input" :label="translate('Tracking number')" label-placement="floating" v-model="manual.trackingIdNumber" :placeholder="translate('Enter tracking number')" />
        </ion-item>
      </ion-list>

      <div v-if="processingMessage" class="ion-text-center ion-padding">
        <ion-label><p>{{ processingMessage }}</p></ion-label>
      </div>
      </template>
    </div>

    <!-- STEP: Result -->
    <div v-else-if="step === 'RESULT'">
      <div class="ion-text-center ion-padding">
        <ion-icon v-if="resultOk" :icon="checkmarkCircleOutline" color="success" />
        <ion-icon v-else :icon="alertCircleOutline" color="danger" />

        <p v-if="resultOk">{{ translate("Successfully fulfilled") }} <span data-testid="bulk-fulfill-success-count">{{ shippedItemCount }}</span> {{ translate("items.") }}</p>
        <template v-else>
          <p data-testid="bulk-fulfill-error-msg">{{ resultMessage }}</p>
          <p v-if="currentShipmentId">{{ translate("Shipment") }}: <strong>{{ currentShipmentId }}</strong></p>
        </template>
      </div>
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button v-if="showFooterBack" data-testid="bulk-fulfill-back-btn" :disabled="isProcessing" @click="handleFooterBack">
          {{ translate("Back") }}
        </ion-button>
        <ion-button v-if="showFooterCancel" data-testid="bulk-fulfill-cancel-btn" :disabled="isProcessing" color="medium" @click="requestClose">
          {{ translate("Cancel") }}
        </ion-button>
        <ion-button v-if="showFooterCancelShipment" data-testid="bulk-fulfill-cancel-shipment-btn" :disabled="isProcessing" color="danger" @click="cancelShipmentFromShipStep">
          {{ translate("Cancel shipment") }}
        </ion-button>
      </ion-buttons>

      <ion-buttons slot="end">
        <ion-button
          v-if="showFooterPrimary"
          data-testid="bulk-fulfill-primary-btn"
          color="primary"
          :disabled="footerPrimaryDisabled"
          @click="handleFooterPrimary">
          <ion-spinner v-if="isProcessing" slot="start" name="crescent" />
          {{ footerPrimaryLabel }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  alertController,
  modalController
} from "@ionic/vue";
import { computed, onMounted, reactive, ref } from "vue";
import { alertCircleOutline, checkmarkCircleOutline, closeOutline, informationCircleOutline, warningOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { useStore } from "vuex";
import { OrderService } from "@/services/OrderService";
import { OrderActionValidator } from "@/utils/OrderActionValidator";
import logger from "@/logger";

const props = defineProps({
  items: { type: Array as any, required: true },
  orderId: { type: String, required: true },
  facilityId: { type: String, required: true },
  order: { type: Object as any, required: true }
});

const store = useStore();

type Step = 'CHOOSE' | 'CONFIRM' | 'SHIP' | 'RESULT';
const step = ref<Step>('CHOOSE');
const shipMode = ref<'LABEL' | 'TRACKING'>('LABEL');
const isProcessing = ref(false);
const processingMessage = ref('');

const openShipments = ref<any[]>([]);
const isLoadingOpen = ref(true);
const initialHadOpenShipments = ref(false);
const resumedFromOpenList = ref(false);

const createdShipmentId = ref('');
const resumedShipment = ref<any>(null);
const currentShipmentNormalized = ref<any>(null);
const shipmentDetail = ref<any>(null);
const shippingRates = ref<any[]>([]);
const isLoadingRates = ref(false);
const selectedCarrierService = ref('');
const selectedRateKey = ref('');

const resultOk = ref(false);
const resultMessage = ref('');
const lastShipPayload = ref<any>(null);
const lastShipKind = ref<'LABEL' | 'TRACKING' | 'NO_TRACKING' | ''>('');

const manual = reactive({
  carrierPartyId: '' as string,
  shipmentMethodTypeId: '' as string,
  trackingIdNumber: '' as string
});

const shipmentMethodsByCarrier = computed(() => store.getters['util/getShipmentMethodsByCarrier'] || {});
const getCarrierDesc = (cpid: string) => store.getters['util/getCarrierDesc'](cpid);

const carrierMethods = computed(() =>
  manual.carrierPartyId ? (shipmentMethodsByCarrier.value[manual.carrierPartyId] || []) : []
);

const eligibleItems = computed(() =>
  props.items.filter((item: any) =>
    OrderActionValidator.validateItemAction(props.order, item, 'FULFILL').allowed &&
    Math.max(0, (item.quantity || 0) - (item.shippedQty || 0)) > 0
  )
);

const skippedCount = computed(() => props.items.length - eligibleItems.value.length);

const totalUnits = computed(() =>
  eligibleItems.value.reduce((sum: number, item: any) =>
    sum + Math.max(0, (item.quantity || 0) - (item.shippedQty || 0)), 0)
);

const originFacilityLabel = computed(() =>
  props.order?.facilityName || props.order?.facilityId || props.facilityId
);

const currentShipmentId = computed(() => createdShipmentId.value);

const shippedItemCount = computed(() =>
  resumedShipment.value?.itemCount ?? eligibleItems.value.length
);

const canGoBackToChoose = computed(() => initialHadOpenShipments.value);

const canRetryShip = computed(() => !!lastShipKind.value && !!currentShipmentId.value);

const canShipCurrent = computed(() => {
  if (!currentShipmentNormalized.value) return true;
  return currentShipmentNormalized.value.canShip !== false;
});

const overbookedDiffs = computed(() => currentShipmentNormalized.value?.overbookedItems || []);

const selectedRate = computed(() =>
  shippingRates.value.find((rate: any) => rateKey(rate) === selectedRateKey.value)
);

const showFooterBack = computed(() =>
  (step.value === 'CONFIRM' && initialHadOpenShipments.value) ||
  (step.value === 'SHIP' && canGoBackToChoose.value) ||
  (step.value === 'RESULT' && !resultOk.value && !!currentShipmentId.value)
);

const showFooterCancel = computed(() =>
  step.value !== 'RESULT' && !currentShipmentId.value && !showFooterBack.value
);

const showFooterCancelShipment = computed(() =>
  !!currentShipmentId.value && !(step.value === 'RESULT' && resultOk.value)
);

const showFooterPrimary = computed(() =>
  step.value !== 'SHIP' || canShipCurrent.value
);

const footerPrimaryLabel = computed(() => {
  if (step.value === 'CHOOSE') return translate("Start new shipment");
  if (step.value === 'CONFIRM') return translate("Create shipment");
  if (step.value === 'SHIP') return translate("Ship");
  if (resultOk.value) return translate("Done");
  if (canRetryShip.value) return translate("Retry shipping");
  if (!currentShipmentId.value) return translate("Close");
  return translate("Back to shipping details");
});

const footerPrimaryDisabled = computed(() => {
  if (isProcessing.value) return true;
  if (step.value === 'CHOOSE') return eligibleItems.value.length === 0 || isLoadingOpen.value;
  if (step.value === 'CONFIRM') return eligibleItems.value.length === 0;
  // SHIP step: button is always enabled so the user can ship with whatever
  // they've entered (or nothing). RESULT inherits the default false.
  return false;
});

function productLabel(productId?: string) {
  if (!productId) return '';
  const item = (props.order?.items || []).find((it: any) => it.productId === productId);
  return item?.productName || item?.internalName || item?.sku || productId;
}

const totalSteps = computed(() => {
  let n = 2; // SHIP + RESULT
  if (!resumedFromOpenList.value) n++; // CONFIRM
  if (initialHadOpenShipments.value) n++; // CHOOSE
  return n;
});

const stepProgress = computed(() => {
  let idx = 1;
  if (step.value === 'CHOOSE') idx = 1;
  else if (step.value === 'CONFIRM') idx = initialHadOpenShipments.value ? 2 : 1;
  else if (step.value === 'SHIP') {
    idx = 1;
    if (initialHadOpenShipments.value) idx++;
    if (!resumedFromOpenList.value) idx++;
  } else idx = totalSteps.value;
  return idx / totalSteps.value;
});

onMounted(async () => {
  const productStoreId = props.order?.productStoreId;
  if (productStoreId) {
    await Promise.allSettled([
      store.dispatch('util/fetchStoreCarrierAndMethods', productStoreId),
      store.dispatch('util/fetchCarriersDetail')
    ]);
  }

  manual.carrierPartyId = props.order?.carrierPartyId || Object.keys(shipmentMethodsByCarrier.value)[0] || '';
  if (manual.carrierPartyId) {
    manual.shipmentMethodTypeId = props.order?.shipmentMethodTypeId
      || (carrierMethods.value[0]?.shipmentMethodTypeId ?? '');
  }

  await loadOpenShipments();
  if (openShipments.value.length === 0) {
    step.value = 'CONFIRM';
  } else {
    initialHadOpenShipments.value = true;
    step.value = 'CHOOSE';
  }
});

async function loadOpenShipments() {
  isLoadingOpen.value = true;
  try {
    const resp = await OrderService.fetchOpenTransferShipments(props.orderId);
    const list = resp?.data?.shipments || resp?.data || [];
    openShipments.value = (Array.isArray(list) ? list : [])
      .filter((s: any) => s && s.statusId !== 'SHIPMENT_SHIPPED' && s.statusId !== 'SHIPMENT_CANCELLED')
      .map(normalizeShipment);
  } catch (err) {
    logger.error('Failed to load open shipments', err);
    openShipments.value = [];
  } finally {
    isLoadingOpen.value = false;
  }
}

function pendingFulfillmentQtyFor(orderItemSeqId: string) {
  const orderItem = (props.order?.items || []).find((it: any) => it.orderItemSeqId === orderItemSeqId);
  if (!orderItem) return 0;
  return Math.max(0, (orderItem.quantity || 0) - (orderItem.shippedQty || 0));
}

function normalizeShipment(s: any) {
  const items = (s.packages || []).flatMap((pkg: any) => pkg.items || []);
  const itemCount = items.length;
  const unitCount = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

  const bookedByOrderItem: Record<string, number> = {};
  items.forEach((it: any) => {
    if (!it.orderItemSeqId) return;
    bookedByOrderItem[it.orderItemSeqId] = (bookedByOrderItem[it.orderItemSeqId] || 0) + (Number(it.quantity) || 0);
  });

  const overbookedItems = Object.entries(bookedByOrderItem)
    .map(([orderItemSeqId, bookedQty]) => ({
      orderItemSeqId,
      bookedQty: bookedQty as number,
      pendingQty: pendingFulfillmentQtyFor(orderItemSeqId),
      productId: items.find((it: any) => it.orderItemSeqId === orderItemSeqId)?.productId
    }))
    .filter(d => d.bookedQty > d.pendingQty);

  const canShip = overbookedItems.length === 0;

  return {
    shipmentId: s.shipmentId,
    statusId: s.statusId,
    createdDate: s.statusDate || s.createdDate,
    itemCount,
    unitCount,
    canShip,
    cancellationOnlyReason: canShip ? undefined : 'Shipment quantity exceeds pending fulfillment.',
    overbookedItems,
    carrierPartyId: s.routeSegCarrierPartyId || s.carrierPartyId,
    shipmentMethodTypeId: s.routeSegShipmentMethodTypeId || s.shipmentMethodTypeId,
    trackingIdNumber: s.trackingIdNumber,
    raw: s
  };
}

function methodDesc(carrierPartyId: string, methodId: string) {
  const m = (shipmentMethodsByCarrier.value[carrierPartyId] || []).find((m: any) => m.shipmentMethodTypeId === methodId);
  return m?.description || methodId;
}

function formatDate(ms: any) {
  if (!ms) return '';
  try {
    return new Date(Number(ms)).toLocaleString();
  } catch {
    return '';
  }
}

function rateKey(rate: any) {
  return (rate.actualCarrier || rate.carrierPartyId) + '_' + (rate.carrierService || rate.shipmentMethodTypeId);
}

function rateName(rate: any) {
  const carrier = getCarrierDesc(rate.actualCarrier || rate.carrierPartyId);
  const methodId = rate.carrierService || rate.shipmentMethodTypeId;
  const m = shipmentMethodsByCarrier.value[rate.carrierPartyId]?.find((m: any) => m.shipmentMethodTypeId === methodId);
  return `${carrier} - ${m?.description || methodId}`;
}

function formatCurrency(amount: any, uom = 'USD') {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: uom || 'USD' }).format(Number(amount));
  } catch {
    return `${amount} ${uom || ''}`.trim();
  }
}

function startNew() {
  resumedFromOpenList.value = false;
  resumedShipment.value = null;
  step.value = 'CONFIRM';
}

function resumeShipment(s: any) {
  resumedFromOpenList.value = true;
  resumedShipment.value = s;
  currentShipmentNormalized.value = s;
  createdShipmentId.value = s.shipmentId;
  if (s.carrierPartyId) manual.carrierPartyId = s.carrierPartyId;
  if (s.shipmentMethodTypeId) manual.shipmentMethodTypeId = s.shipmentMethodTypeId;
  if (s.trackingIdNumber) manual.trackingIdNumber = s.trackingIdNumber;
  step.value = 'SHIP';
  if (s.canShip) loadShipmentAndRates(s.shipmentId);
}

function backToChoose() {
  resumedFromOpenList.value = false;
  resumedShipment.value = null;
  currentShipmentNormalized.value = null;
  createdShipmentId.value = '';
  shipmentDetail.value = null;
  shippingRates.value = [];
  selectedRateKey.value = '';
  lastShipPayload.value = null;
  lastShipKind.value = '';
  step.value = 'CHOOSE';
}

function handleFooterBack() {
  if (step.value === 'CONFIRM') {
    step.value = 'CHOOSE';
  } else if (step.value === 'SHIP') {
    backToChoose();
  } else if (step.value === 'RESULT') {
    step.value = 'SHIP';
  }
}

async function handleFooterPrimary() {
  if (step.value === 'CHOOSE') {
    startNew();
  } else if (step.value === 'CONFIRM') {
    await createShipment();
  } else if (step.value === 'SHIP') {
    await shipCurrent();
  } else if (resultOk.value) {
    closeFinal(true);
  } else if (canRetryShip.value) {
    await retryShipping();
  } else if (!currentShipmentId.value) {
    closeFinal(false);
  } else {
    step.value = 'SHIP';
  }
}

async function shipCurrent() {
  if (shipMode.value === 'LABEL' && selectedRate.value) {
    await generateLabelForRate(selectedRate.value);
    return;
  }
  if (shipMode.value === 'TRACKING' && manual.trackingIdNumber.trim()) {
    await shipWithManualTracking();
    return;
  }
  await shipWithoutTracking();
}

async function createShipment() {
  isProcessing.value = true;
  processingMessage.value = translate('Creating shipment...');

  const payload = {
    payload: {
      orderId: props.orderId,
      packages: [
        {
          items: eligibleItems.value.map((item: any) => ({
            orderItemSeqId: item.orderItemSeqId,
            productId: item.productId,
            quantity: Math.max(0, (item.quantity || 0) - (item.shippedQty || 0)),
            shipGroupSeqId: item.shipGroupSeqId || '00001'
          }))
        }
      ]
    }
  };

  try {
    const resp = await OrderService.createTransferOrderShipment(payload);
    const shipmentId = resp?.data?.shipmentId || resp?.data?.payload?.shipmentId;
    if (resp.status === 200 && shipmentId) {
      createdShipmentId.value = shipmentId;
      currentShipmentNormalized.value = null;
      step.value = 'SHIP';
      loadShipmentAndRates(shipmentId);
    } else {
      resultOk.value = false;
      resultMessage.value = translate('Failed to create shipment.');
      step.value = 'RESULT';
      logger.error('Create shipment failed', resp);
    }
  } catch (err: any) {
    resultOk.value = false;
    resultMessage.value = err?.message || translate('Failed to create shipment.');
    step.value = 'RESULT';
    logger.error('Create shipment error', err);
  } finally {
    isProcessing.value = false;
    processingMessage.value = '';
  }
}

async function loadShipmentAndRates(shipmentId: string) {
  isLoadingRates.value = true;
  try {
    const [detailResp, ratesResp] = await Promise.all([
      OrderService.fetchTransferShipmentDetail({ shipmentId }),
      OrderService.fetchShippingRates({ shipmentId })
    ]);
    shipmentDetail.value = detailResp?.data?.shipments?.[0] || detailResp?.data || null;
    shippingRates.value = ratesResp?.data?.shippingRates || [];
    selectedRateKey.value = shippingRates.value.length === 1 ? rateKey(shippingRates.value[0]) : '';
  } catch (err) {
    logger.error('Failed to load shipping rates', err);
    shippingRates.value = [];
    selectedRateKey.value = '';
  } finally {
    isLoadingRates.value = false;
  }
}

async function generateLabelForRate(rate: any) {
  if (!currentShipmentId.value) return;
  selectedCarrierService.value = rateKey(rate);
  isProcessing.value = true;
  processingMessage.value = translate('Generating shipping label...');

  try {
    const updPayload: any = {
      shipmentId: currentShipmentId.value,
      shipmentRouteSegmentId: shipmentDetail.value?.shipmentRouteSegmentId,
      shipmentMethodTypeId: rate.shipmentMethodTypeId || rate.carrierServiceCode,
      carrierPartyId: rate.carrierPartyId,
      actualCost: rate.shippingEstimateAmount,
      carrierServiceStatusId: 'SHRSCS_CONFIRMED'
    };
    if (rate.actualCarrierCode) updPayload.actualCarrierCode = rate.actualCarrierCode;
    if (rate.carrierService) updPayload.carrierService = rate.carrierService;
    if (rate.gatewayRateId) updPayload.gatewayRateId = rate.gatewayRateId;

    const updResp = await OrderService.updateRouteShipmentCarrierAndMethod(updPayload);
    if (updResp.status !== 200) throw new Error(translate('Failed to set carrier and method.'));

    const labelResp = await OrderService.retryShippingLabel(currentShipmentId.value);
    if (labelResp.status !== 200) throw new Error(translate('Failed to generate shipping label.'));

    lastShipKind.value = 'LABEL';
    await shipShipment({});
  } catch (err: any) {
    finishWithShipFailure(err);
  } finally {
    selectedCarrierService.value = '';
  }
}

async function shipWithManualTracking() {
  if (!currentShipmentId.value) return;
  if (!manual.trackingIdNumber.trim()) return;
  isProcessing.value = true;
  processingMessage.value = translate('Shipping shipment...');

  try {
    if (manual.carrierPartyId && manual.shipmentMethodTypeId) {
      await OrderService.updateRouteShipmentCarrierAndMethod({
        shipmentId: currentShipmentId.value,
        shipmentRouteSegmentId: shipmentDetail.value?.shipmentRouteSegmentId || '00001',
        carrierPartyId: manual.carrierPartyId,
        shipmentMethodTypeId: manual.shipmentMethodTypeId,
        trackingIdNumber: manual.trackingIdNumber
      });
    }
    lastShipKind.value = 'TRACKING';
    await shipShipment({
      shipmentRouteSegmentId: shipmentDetail.value?.shipmentRouteSegmentId || '00001',
      carrierPartyId: manual.carrierPartyId || undefined,
      shipmentMethodTypeId: manual.shipmentMethodTypeId || undefined,
      trackingIdNumber: manual.trackingIdNumber
    });
  } catch (err: any) {
    finishWithShipFailure(err);
  }
}

async function shipWithoutTracking() {
  if (!currentShipmentId.value) return;
  isProcessing.value = true;
  processingMessage.value = translate('Shipping shipment...');

  try {
    lastShipKind.value = 'NO_TRACKING';
    await shipShipment({});
  } catch (err: any) {
    finishWithShipFailure(err);
  }
}

async function shipShipment(extra: Record<string, any>) {
  const payload: any = {
    shipmentId: currentShipmentId.value,
    orderId: props.orderId,
    ...extra
  };
  lastShipPayload.value = payload;
  const resp = await OrderService.shipTransferOrderShipment(payload);
  if (resp.status !== 200) {
    throw new Error(translate('Shipment was created but could not be shipped.'));
  }
  resultOk.value = true;
  resultMessage.value = '';
  step.value = 'RESULT';
  isProcessing.value = false;
  processingMessage.value = '';
}

async function retryShipping() {
  if (!lastShipPayload.value) return;
  isProcessing.value = true;
  processingMessage.value = translate('Shipping shipment...');
  try {
    const resp = await OrderService.shipTransferOrderShipment(lastShipPayload.value);
    if (resp.status !== 200) throw new Error(translate('Shipment was created but could not be shipped.'));
    resultOk.value = true;
    resultMessage.value = '';
    step.value = 'RESULT';
  } catch (err: any) {
    finishWithShipFailure(err);
  } finally {
    isProcessing.value = false;
    processingMessage.value = '';
  }
}

function finishWithShipFailure(err: any) {
  logger.error('Ship transfer shipment failed', err);
  resultOk.value = false;
  resultMessage.value = err?.message || translate('Shipment was created but could not be shipped.');
  step.value = 'RESULT';
  isProcessing.value = false;
  processingMessage.value = '';
}

async function cancelShipmentFromShipStep() {
  if (!currentShipmentId.value) return;
  let confirmed = false;
  const alert = await alertController.create({
    header: translate('Cancel shipment'),
    message: translate('This will cancel shipment @id and return inventory.').replace('@id', currentShipmentId.value),
    buttons: [
      { text: translate('Keep shipment'), role: 'cancel' },
      {
        text: translate('Cancel shipment'),
        role: 'destructive',
        handler: () => { confirmed = true; }
      }
    ]
  });
  await alert.present();
  await alert.onDidDismiss();
  if (confirmed) {
    await doCancelShipment();
  }
}

async function doCancelShipment() {
  isProcessing.value = true;
  processingMessage.value = translate('Cancelling shipment...');
  try {
    const resp = await OrderService.cancelTransferOrderShipment(currentShipmentId.value);
    if (resp.status !== 200) throw new Error(translate('Failed to cancel shipment.'));

    if (initialHadOpenShipments.value) {
      createdShipmentId.value = '';
      resumedShipment.value = null;
      resumedFromOpenList.value = false;
      shipmentDetail.value = null;
      shippingRates.value = [];
      lastShipPayload.value = null;
      lastShipKind.value = '';
      await loadOpenShipments();
      if (openShipments.value.length === 0) {
        step.value = eligibleItems.value.length > 0 ? 'CONFIRM' : 'RESULT';
        if (step.value === 'RESULT') {
          resultOk.value = true;
          resultMessage.value = '';
        }
      } else {
        step.value = 'CHOOSE';
      }
    } else {
      // exit modal so order detail refreshes
      modalController.dismiss({ isCompleted: true, cancelled: true, shipmentId: currentShipmentId.value });
    }
  } catch (err: any) {
    logger.error('Cancel shipment failed', err);
    resultOk.value = false;
    resultMessage.value = err?.message || translate('Failed to cancel shipment.');
    step.value = 'RESULT';
  } finally {
    isProcessing.value = false;
    processingMessage.value = '';
  }
}

async function requestClose() {
  const hasUnshippedShipment = !!currentShipmentId.value && !(step.value === 'RESULT' && resultOk.value);
  if (!hasUnshippedShipment) {
    closeFinal(step.value === 'RESULT' && resultOk.value);
    return;
  }

  let choice: '' | 'CANCEL' | 'LEAVE' = '';
  const alert = await alertController.create({
    header: translate('Shipment in progress'),
    message: translate('Shipment @id was created but not shipped. What would you like to do?').replace('@id', currentShipmentId.value),
    buttons: [
      { text: translate('Return to shipping'), role: 'cancel' },
      { text: translate('Cancel shipment and exit'), role: 'destructive', handler: () => { choice = 'CANCEL'; } },
      { text: translate('Leave without cancelling'), handler: () => { choice = 'LEAVE'; } }
    ]
  });
  await alert.present();
  await alert.onDidDismiss();
  if (choice === 'CANCEL') {
    await doCancelShipment();
    modalController.dismiss({ isCompleted: true, cancelled: true });
  } else if (choice === 'LEAVE') {
    modalController.dismiss({ isCompleted: false, openShipmentLeft: currentShipmentId.value });
  }
}

function closeFinal(completed: boolean) {
  modalController.dismiss({
    isCompleted: completed,
    createdShipmentId: createdShipmentId.value
  });
}
</script>
