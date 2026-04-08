<template>
  <ion-modal :is-open="isOpen" :backdrop-dismiss="false" class="streaming-loader-modal">
    <div class="loader-container">
      <ion-card class="loader-card">
        <ion-card-header>
          <ion-card-title>{{ translate("Fetching Data") }}</ion-card-title>
          <ion-card-subtitle>{{ translate("Please wait while we set things up") }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item v-for="(task, key) in tasks" :key="key">
              <ion-icon 
                slot="start" 
                :icon="task.status === 'success' ? checkmarkCircleOutline : task.status === 'error' ? alertCircleOutline : ellipseOutline" 
                :color="task.status === 'success' ? 'success' : task.status === 'error' ? 'danger' : 'medium'"
              />
              <ion-label>
                {{ translate(task.label) }}
              </ion-label>
              <ion-spinner v-if="task.status === 'pending'" name="crescent" slot="end" size="small" />
            </ion-item>
          </ion-list>

          <div v-if="hasError" class="error-section ion-padding-top">
            <ion-item lines="none" class="error-message-item">
              <ion-icon :icon="warningOutline" slot="start" color="danger" />
              <ion-label class="ion-text-wrap">
                  {{ translate("Error") }}: {{ firstErrorMessage }}
              </ion-label>
            </ion-item>
            
            <div class="diagnostics-toggle ion-text-center ion-margin-vertical" @click="showDiagnostics = !showDiagnostics">
              <ion-text color="medium">
                <small>{{ translate(showDiagnostics ? 'Hide Advanced Diagnostics' : 'Show Advanced Diagnostics') }}</small>
              </ion-text>
              <ion-icon :icon="showDiagnostics ? chevronUpOutline : chevronDownOutline" color="medium" class="ion-margin-start" />
            </div>

            <div v-if="showDiagnostics" class="diagnostics-content ion-margin-bottom">
              <div class="diagnostics-header">
                <ion-button fill="clear" size="small" @click="copyDiagnostics" class="ion-no-padding">
                  <ion-icon :icon="copyOutline" slot="start" />
                  {{ translate("Copy for support") }}
                </ion-button>
              </div>
              <pre class="error-stack">{{ diagnosticData }}</pre>
            </div>

            <div class="actions">
              <ion-button expand="block" fill="outline" @click="$emit('dismiss')">
                {{ translate("View anyway") }}
              </ion-button>
              <div class="secondary-actions ion-padding-top">
                <ion-button fill="clear" @click="$emit('reload')" class="ion-no-padding">
                  {{ translate("Reload") }}
                </ion-button>
                <ion-button fill="clear" color="medium" @click="$emit('go-back')" class="ion-no-padding">
                  {{ translate("Go back") }}
                </ion-button>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { 
  IonButton,
  IonCard, 
  IonCardContent, 
  IonCardHeader, 
  IonCardSubtitle, 
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSpinner,
  IonText
} from '@ionic/vue';
import { 
  checkmarkCircleOutline, 
  alertCircleOutline, 
  ellipseOutline,
  warningOutline,
  chevronDownOutline,
  chevronUpOutline,
  copyOutline
} from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';
import { showToast } from '@/utils';

export default defineComponent({
  name: 'StreamingLoader',
  components: {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonSpinner,
    IonText
  },
  props: {
    tasks: {
      type: Object,
      required: true
    },
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['dismiss', 'reload', 'go-back'],
  setup(props) {
    const showDiagnostics = ref(false);

    const hasError = computed(() => {
      return Object.values(props.tasks).some((task: any) => task.status === 'error');
    });

    const firstErrorMessage = computed(() => {
      const errorTask = Object.values(props.tasks).find((task: any) => task.status === 'error') as any;
      if (!errorTask) return '';
      
      const e = errorTask.fullError;
      const errors = e?.response?.data?.errors;
      // Handle array of errors or single error message
      return (Array.isArray(errors) ? errors.join(', ') : errors) || e?.message || errorTask.errorMessage || translate('An unexpected error occurred');
    });

    const diagnosticData = computed(() => {
      const errorTask = Object.values(props.tasks).find((task: any) => task.status === 'error') as any;
      if (!errorTask || !errorTask.fullError) return translate('No diagnostic data available');
      
      const e = errorTask.fullError;
      return JSON.stringify({
        task: errorTask.label,
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        url: e.config?.url,
        params: e.config?.params
      }, null, 2);
    });

    const copyDiagnostics = async () => {
      try {
        await navigator.clipboard.writeText(diagnosticData.value);
        showToast(translate("Diagnostics copied to clipboard"));
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }

    return {
      checkmarkCircleOutline,
      alertCircleOutline,
      ellipseOutline,
      warningOutline,
      chevronDownOutline,
      chevronUpOutline,
      copyOutline,
      hasError,
      firstErrorMessage,
      diagnosticData,
      showDiagnostics,
      copyDiagnostics,
      translate
    };
  }
});
</script>

<style scoped>
.streaming-loader-modal {
  --width: 440px;
  --height: fit-content;
  --max-height: 90vh;
  --border-radius: 12px;
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.streaming-loader-modal::part(backdrop) {
  backdrop-filter: blur(8px);
  opacity: 1;
}

.loader-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.loader-card {
  margin: 0;
  width: 100%;
  box-shadow: none;
  overflow: auto;
}

.error-message-item {
  --background: rgba(var(--ion-color-danger-rgb), 0.1);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.diagnostics-toggle {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diagnostics-content {
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 8px;
  background: var(--ion-color-light);
  overflow: hidden;
}

.diagnostics-header {
  display: flex;
  justify-content: flex-end;
  background: var(--ion-color-light-shade);
  padding: 0 8px;
}

.error-stack {
  margin: 0;
  padding: 12px;
  font-size: 0.75rem;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
}

.secondary-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

ion-icon {
  font-size: 20px;
}

@media (max-width: 768px) {
  .streaming-loader-modal {
    --width: 95%;
  }
}
</style>
