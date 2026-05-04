<template>
  <div class="progress-bar-wrapper ion-padding" data-testid="progress-bar">
    <ion-label data-testid="progress-bar-label">{{ translate("Loading order details...") }}</ion-label>
    <ion-progress-bar data-testid="progress-bar-progress" class="ion-margin-vertical bar-width" :value="progressValue"></ion-progress-bar>
    <ion-note data-testid="progress-bar-note">{{ loadedItems }} / {{ totalItems }}</ion-note>
  </div>
</template>

<script setup lang="ts">
import { IonLabel, IonProgressBar, IonNote } from '@ionic/vue'
import { computed } from 'vue'
import { translate } from '@hotwax/dxp-components'

const props = defineProps({
  totalItems: {
    type: Number,
    required: true
  },
  loadedItems: {
    type: Number,
    default: 0
  }
})

const progressValue = computed(() => {
  if (!props.totalItems) return 0
  return Math.min(props.loadedItems / props.totalItems, 1)
})
</script>

<style scoped>
.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.bar-width {
  width: 60%;
}
</style>
