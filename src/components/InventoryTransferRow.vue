<template>
  <div class="list-item inventory-transfer-row">
    <ion-item
      lines="none"
      :button="selectMode && selectable"
      :detail="false"
      :disabled="selectMode && !selectable"
      @click="toggleSelection"
    >
      <ion-checkbox
        v-if="selectMode"
        slot="start"
        :checked="selected"
        :disabled="!selectable"
        :aria-label="translate('Select inventory transfer')"
        @click.stop
        @ionChange="emit('selection-change', $event.detail.checked)"
      />
      <ion-thumbnail slot="start">
        <Image :src="imageUrl" />
      </ion-thumbnail>
      <ion-label class="ion-text-wrap">
        <p class="overline">{{ translate('Transfer') }} {{ transfer.inventoryTransferId }}</p>
        {{ primaryIdentifier }}
        <p v-if="createdTime" class="ion-text-nowrap">{{ createdTime }}</p>
      </ion-label>
      <ion-note slot="end" class="quantity">{{ transfer.quantity }}</ion-note>
    </ion-item>

    <div class="movement">
      <ion-chip outline>
        <ion-icon :icon="sendOutline" />
        <ion-label>{{ sourceFacilityName }}</ion-label>
      </ion-chip>
      <ion-chip outline>
        <ion-icon :icon="downloadOutline" />
        <ion-label>{{ destinationFacilityName }}</ion-label>
      </ion-chip>
    </div>

    <ion-label v-if="transfer.orderId" class="ion-text-wrap">
      {{ orderName }}
    </ion-label>
    <ion-label v-else>—</ion-label>

    <div v-if="!selectable" class="metadata">
      <ion-badge :color="statusColor">{{ statusLabel }}</ion-badge>
    </div>

    <ion-buttons v-if="canManage && selectable && !selectMode">
      <ion-button fill="clear" @click.stop="emit('execute')">{{ translate('Execute') }}</ion-button>
      <ion-button
        fill="clear"
        color="danger"
        :aria-label="translate('Cancel inventory transfer')"
        @click.stop="emit('cancel')"
      >
        <ion-icon slot="icon-only" :icon="closeCircleOutline" />
      </ion-button>
    </ion-buttons>
  </div>
</template>

<script setup lang="ts">
import {
  IonBadge, IonButton, IonButtons, IonCheckbox, IonChip, IonIcon, IonItem, IonLabel,
  IonNote, IonThumbnail,
} from '@ionic/vue';
import { closeCircleOutline, downloadOutline, sendOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { translate } from '@common';
import Image from '@/components/Image.vue';

const props = defineProps<{
  transfer: any;
  imageUrl: string;
  primaryIdentifier: string;
  sourceFacilityName: string;
  destinationFacilityName: string;
  orderName: string;
  createdTime: string;
  statusLabel: string;
  statusColor: string;
  canManage: boolean;
  selectMode: boolean;
  selected: boolean;
}>();

const emit = defineEmits<{
  (event: 'selection-change', selected: boolean): void;
  (event: 'execute'): void;
  (event: 'cancel'): void;
}>();

const selectable = computed(() => props.transfer.statusId === 'IXF_REQUESTED');

function toggleSelection() {
  if (props.selectMode && selectable.value) emit('selection-change', !props.selected);
}
</script>

<style scoped>
.inventory-transfer-row {
  --columns-tablet: 5;
  --columns-desktop: 5;
  grid-template-columns: minmax(18rem, 2fr) minmax(16rem, 2fr) 1fr auto auto;
  border-bottom: var(--border-medium);
  padding-inline-end: var(--spacer-sm);
}

.inventory-transfer-row > * {
  display: unset;
}

.movement {
  display: flex;
  flex-wrap: wrap;
}

.metadata {
  text-align: end;
}

.quantity {
  align-self: center;
}

@media (max-width: 990px) {
  .inventory-transfer-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacer-sm);
    padding: var(--spacer-sm);
  }

  .inventory-transfer-row > ion-item,
  .inventory-transfer-row > ion-buttons {
    grid-column: 1 / -1;
  }
}
</style>
