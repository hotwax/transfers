<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/tabs/transfers`" />
        <ion-title>{{ translate("Create transfer order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter-content">
      <div class="find">
        <section class="search">
          <ion-item>
            <ion-input :label="translate('Transfer name')" placeholder="Placeholder" />
          </ion-item>
        </section>

        <aside class="filters">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Assign") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>{{ translate("Origin") }}</ion-label>
              <ion-button slot="end" fill="outline">
                <ion-icon :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>{{ translate("Destination") }}</ion-label>
              <ion-button slot="end" fill="outline">
                <ion-icon :icon="addCircleOutline" />
                <ion-label>{{ translate("Assign") }}</ion-label>
              </ion-button>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Shipping Method") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-select :label="translate('Method')" value="">
                <ion-select-option value="">{{ "Next Day Shipping" }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Carrier')" value="">
                <ion-select-option value="">{{ "Forza" }}</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Plan") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ translate("Ship Date") }}</ion-label>
              <ion-button slot="end" class="date-time-button">{{ "3rd March 2024" }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Delivery Date") }}</ion-label>
            <ion-button slot="end" class="date-time-button">{{ "3rd March 2024" }}</ion-button>
            </ion-item>
          </ion-card>

          <ion-item>
            <ion-icon :icon="cloudUploadOutline" slot="start" />
            <ion-label>{{ translate("Import Items CSV") }}</ion-label>
            <ion-button fill="clear" color="medium">{{ translate("Upload") }}</ion-button>
          </ion-item>
        </aside>

        <main>
          <div class="item-search">
            <ion-item>
              <ion-icon slot="start" :icon="listOutline"/>
              <ion-input :label="translate('Add product')" label-placement="floating" :clear-input="true" />
            </ion-item>
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image src=""/>
              </ion-thumbnail>
              <ion-label>
                <p class="overline">{{ translate("Search result") }}</p>
                {{ "Product name" }}
              </ion-label>
              <ion-button slot="end" fill="clear">
                <ion-icon slot="icon-only" :icon="addCircleOutline"/>
              </ion-button>
            </ion-item>
          </div>

          <hr />

          <div class="list-item ion-padding-vertical">
            <ion-item lines="none" class="item-qty-actions" style="grid-column: span 2;">
              <ion-button fill="outline" color="medium">{{ translate("Book QOH") }}</ion-button>
              <ion-button fill="outline" color="medium">{{ translate("Book ATP") }}</ion-button>
              <ion-button fill="outline" color="medium">{{ translate("Custom Qty") }}</ion-button>
            </ion-item>
            <div></div>
            <div class="tablet">
              <ion-checkbox />
            </div>
            <ion-button slot="end" fill="clear" color="medium">
              <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
            </ion-button>
          </div>

          <div class="list-item">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image src="" />
              </ion-thumbnail>
              <ion-label>
                {{ "Primary Identifier" }}
                <p>{{ "Secondary Identifier" }}</p>
              </ion-label>
            </ion-item>
            <div class="tablet">
              <ion-chip outline>
                <ion-icon :icon="sendOutline" />
                <ion-label>{{ "50 QOH" }}</ion-label>
              </ion-chip>
            </div>
            <ion-item>
              <ion-input placeholder="Qty" />
            </ion-item>
            <div class="tablet">
              <ion-checkbox />
            </div>
            <ion-button slot="end" fill="clear" color="medium">
              <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
            </ion-button>
          </div>
        </main>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar } from '@ionic/vue';
import { addCircleOutline, checkmarkDoneOutline, cloudUploadOutline, downloadOutline, ellipsisVerticalOutline, listOutline, sendOutline } from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components'
</script>

<style scoped>
.list-item {
  --columns-desktop: 5;
  border-bottom: var(--border-medium);
}

/* Added width property as after updating to ionic7 min-width is getting applied on ion-label inside ion-item
which results in distorted label text and thus reduced ion-item width */
.list-item > ion-item {
  width: 100%;
}

.item-qty-actions {
  grid-column: span 2;
}


@media (min-width: 991px) {
  .item-search {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 40px;
  }

  .find {
    margin-right: 0;
  }
}
</style>