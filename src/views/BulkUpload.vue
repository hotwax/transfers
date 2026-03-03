<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button data-testid="bulk-upload-back-btn" slot="start" default-href="/create-order" />
        <ion-title>{{ translate("Bulk upload") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="main">
        <ion-item lines="full">
          <ion-label>{{ translate("Transfer orders") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end">{{ uploadedFile.name }}</ion-label>
          <input @change="parse" ref="file" class="ion-hide" type="file" id="transferOrderInputFile" data-testid="bulk-upload-file-input" />
          <label for="transferOrderInputFile" data-testid="bulk-upload-file-label">{{ translate("Upload") }}</label>
        </ion-item>

        <ion-button data-testid="bulk-download-template-btn" color="medium" expand="block" @click="downloadTemplate">
          {{ translate("Download template") }}
          <ion-icon slot="end" :icon="downloadOutline" />
        </ion-button>

        <ion-list class="field-mappings">
          <ion-item-divider color="light">
            <ion-label>{{ translate("Required") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, true)">
            <ion-select :data-testid="`bulk-field-select-${field}`" interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{ translate(fieldValues.label) }}
                <p>{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Optional") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, false)">
            <ion-select :data-testid="`bulk-field-select-${field}`" interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{ translate(fieldValues.label) }}
                <p>{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-button data-testid="bulk-upload-submit-btn" :disabled="!content.length" @click="save" expand="block">
          {{ translate("Submit") }}
          <ion-icon slot="end" :icon="cloudUploadOutline" />
        </ion-button>

        <ion-list v-if="systemMessages.length" class="system-message-section" data-testid="bulk-upload-systemmessages">
          <ion-list-header>
            <ion-label>
                {{ translate("Recently uploaded files") }}
              </ion-label>
          </ion-list-header>
          <ion-item v-for="systemMessage in systemMessages" :key="systemMessage.systemMessageId" :data-testid="`bulk-upload-message-${systemMessage.systemMessageId}`">
            <ion-label>
              <p class="overline">{{ systemMessage.systemMessageId }}</p>
              {{ extractFilename(systemMessage.messageText) }}
            </ion-label>
            <div slot="end" class="system-message-action">
              <ion-note>{{ getFileProcessingStatus(systemMessage) }}</ion-note>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonBackButton, IonButton, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter } from '@ionic/vue';
import { cloudUploadOutline, downloadOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components';
import { onBeforeUnmount, ref } from "vue";
import logger from "@/logger";
import { showToast, jsonToCsv, parseCsv } from "@/utils"
import { hasError } from '@/adapter';
import { OrderService } from '@/services/OrderService';

const systemMessages = ref([]);
let refreshInterval = null;

onIonViewDidEnter(async () => {
  resetDefaults();
});

onBeforeUnmount(() => {
  clearInterval(refreshInterval);
});

/* ---------- BulkUpload Data ---------- */
let file = ref(null);
let uploadedFile = ref({});
let fileName = ref(null);
let content = ref([]);
let fieldMapping = ref({});
let fileColumns = ref([]);

// We are mapping fields that are needed to create an order
const fields = {
  externalOrderId: {
    label: "External Order ID",
    description: "The unique identifier for the order in the external system",
    required: true
  },
  originFacilityId: {
    label: "Origin Facility ID",
    description: "The facility ID from which items will be transferred",
    required: true
  },
  destinationFacilityId: {
    label: "Destination Facility ID",
    description: "The facility ID where items will be received",
    required: true
  },
  sku: {
    label: "SKU",
    description: "The product SKU",
    required: true
  },
  quantity: {
    label: "Quantity",
    description: "The quantity to transfer",
    required: true
  },
  orderName: {
    label: "Order Name",
    description: "Name of the transfer order",
    required: false
  },
  productStoreId: {
    label: "Product Store ID",
    description: "The product store ID (defaults to current store if empty)",
    required: false
  },
  carrierPartyId: {
    label: "Carrier Party ID",
    description: "The carrier party ID",
    required: false
  },
  shipmentMethodTypeId: {
    label: "Shipment Method Type ID",
    description: "The shipment method type ID",
    required: false
  },
  statusFlowId: {
    label: "Status Flow ID",
    description: "The order lifecycle status flow",
    required: false
  },
  shipDate: {
    label: "Ship Date",
    description: "The estimated ship date (YYYY-MM-DD)",
    required: false
  },
  deliveryDate: {
    label: "Delivery Date",
    description: "The estimated delivery date (YYYY-MM-DD)",
    required: false
  }
};

const templateRows = [
  {
    externalOrderId: "EXT-101",
    originFacilityId: "FACILITY_1",
    destinationFacilityId: "FACILITY_2",
    sku: "SKU-12345",
    quantity: "10",
    orderName: "Weekly Transfer",
    productStoreId: "STORE_1",
    carrierPartyId: "USPS",
    shipmentMethodTypeId: "STANDARD",
    statusFlowId: "TO_Fulfill_And_Receive",
    shipDate: "2023-11-01",
    deliveryDate: "2023-11-05"
  },
  {
    externalOrderId: "EXT-101",
    originFacilityId: "FACILITY_1",
    destinationFacilityId: "FACILITY_2",
    sku: "SKU-98765",
    quantity: "5",
    orderName: "",
    productStoreId: "",
    carrierPartyId: "",
    shipmentMethodTypeId: "",
    statusFlowId: "",
    shipDate: "",
    deliveryDate: ""
  }
];

/* ---------- Bulk Upload Logic ---------- */
function getFilteredFields(fields, required = true) {
  return Object.keys(fields).reduce((row, key) => { if (fields[key].required === required) row[key] = fields[key]; return row; }, {});
}
function extractFilename(path) {
  if (!path) return;
  const fn = path.substring(path.lastIndexOf("/") + 1);
  return fn.replace(/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d{3}\.csv$/, ".csv");
}
function resetFieldMapping() { fieldMapping.value = Object.keys(fields).reduce((mapping, key) => (mapping[key] = "", mapping), {}); }
function resetDefaults() {
  resetFieldMapping();
  uploadedFile.value = {};
  content.value = [];
  fileName.value = null;
  if(file.value) file.value.value = "";
}

function downloadTemplate() {
  const columns = Object.keys(fields);
  const rowsWithColumns = templateRows.map(row => {
    if (!columns.length) return row;
    return columns.reduce((result, key) => ({ ...result, [key]: row[key] || "" }), {});
  });

  jsonToCsv(rowsWithColumns, {
    parse: {},
    download: true,
    name: "TransferOrderUploadTemplate.csv"
  });
}

async function parse(event) {
  const file = event.target.files[0];
  try {
    if (file) {
      uploadedFile.value = file;
      fileName.value = file.name;
      content.value = await parseCsv(file);
      fileColumns.value = Object.keys(content.value[0]);
      showToast(translate("File uploaded successfully"));
      resetFieldMapping();
    }
  } catch {
    content.value = [];
    showToast(translate("Please upload a valid csv to continue"));
  }
}
async function save() {
  const required = Object.keys(getFilteredFields(fields, true));
  const selected = Object.keys(fieldMapping.value).filter(key => fieldMapping.value[key]);
  if (!required.every(field => selected.includes(field))) return showToast(translate("Select all required fields to continue"));
  const uploadedData = content.value.map(row => {
    const dataRow = {};
    Object.keys(fields).forEach(field => {
       const mappedColumn = fieldMapping.value[field];
       if (mappedColumn) {
          dataRow[field] = row[mappedColumn];
       }
    })
    return dataRow;
  });
  const data = jsonToCsv(uploadedData, {
    parse: {},
    download: false,
    name: fileName.value
  });
  const fd = new FormData();
  fd.append("uploadedFile", data, fileName.value);
  fd.append("fileName", fileName.value.replace(".csv", ""));
  try {
    const resp = await OrderService.uploadTransferOrders({ data: fd, headers: { "Content-Type": "multipart/form-data;" } });
    if (!hasError(resp)) {
      resetDefaults();
      showToast(translate("The transfer orders file uploaded successfully."));
    } else throw resp.data;
  } catch (err) {
    logger.error(err);
    showToast(translate("Failed to upload the file, please try again"));
  }
}

</script>

<style scoped>
.main {
  max-width: 560px;
  margin: var(--spacer-sm) auto 0;
}
.field-mappings {
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  margin-block: var(--spacer-lg);
}

.field-mappings ion-select::part(label) {
  max-width: 80%;
}

.field-mappings ion-select.select-disabled::part(placeholder), .field-mappings ion-select.select-disabled::part(icon) {
  opacity: .3;
}

.field-mappings ion-select ion-label {
  padding-block: var(--spacer-xs)
}

.field-mappings ion-item ion-label[slot="label"], .field-mappings ion-item ion-select.select-disabled {
  opacity: 1;
}

.system-message-section {
  margin-bottom: var(--spacer-sm);
}
.system-message-action>ion-button {
  vertical-align: middle;
}
</style>
