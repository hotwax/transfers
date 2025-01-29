<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Transfer orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon :icon="downloadOutline" slot="icon-only" />
          </ion-button>
          <ion-button>
            <ion-icon :icon="filterOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter-content">
      <div class="find">
        <section class="search">
          <ion-searchbar :placeholder="translate('Search transfer orders')" />
        </section>

        <aside class="filters">
          <ion-list>
            <h2>{{ translate("Location") }}</h2>
            <ion-item lines="none">
              <ion-select :label="translate('Product Store')" interface="popover" value="">
                <ion-select-option value="">Notnaked</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Origin')" interface="popover" value="">
                <ion-select-option value="">California Warehouse</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Destination')" interface="popover" value="">
                <ion-select-option value="">Irvine Spectrum</ion-select-option>
              </ion-select>
            </ion-item>

            <h2>{{ translate("Fulfillment") }}</h2>
            <ion-item lines="none">
              <ion-select :label="translate('Method')" interface="popover" value="">
                <ion-select-option value="">{{ "All" }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Carrier')" interface="popover" value="">
                <ion-select-option value="">{{ "All" }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-select :label="translate('Status')" interface="popover" value="">
                <ion-select-option value="">{{ "All" }}</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </aside>

        <main>
          <section class="sort">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="documentTextOutline" />
              <ion-select :label="translate('Group by')" interface="popover" value="">
                <ion-select-option value="">{{ "Order item" }}</ion-select-option>
                <ion-select-option value="">{{ "Destination" }}</ion-select-option>
                <ion-select-option value="">{{ "Destination and product" }}</ion-select-option>
                <ion-select-option value="">{{ "Origin" }}</ion-select-option>
                <ion-select-option value="">{{ "Origin and product" }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-icon slot="start" :icon="swapVerticalOutline" />
              <ion-select :label="translate('Sort by')" interface="popover" value="">
                <ion-select-option value="">{{ "Created date" }}</ion-select-option>
              </ion-select>
            </ion-item>
          </section>

          <hr />

          <div>
            <div @click="router.push('/order-detail')">
              <section class="section-header">
                <div class="primary-info">
                  <ion-item lines="none">
                    <ion-label>
                      <strong>{{ "Order Name" }}</strong>
                      <p>{{ "Order Internal Id" }}</p>
                    </ion-label>
                  </ion-item>
                </div>
  
                <div class="tags">
                  <ion-chip outline>
                    <ion-icon :icon="sendOutline" />
                    <ion-label>{{ "Central warehouse" }}</ion-label>
                  </ion-chip>
                  <ion-chip outline>
                    <ion-icon :icon="downloadOutline" />
                    <ion-label>{{ "Irvine spectrum" }}</ion-label>
                  </ion-chip>
                </div>
  
                <div class="metadata">
                  <ion-note>{{ translate("Created on") }} {{ "7 Jan 2024" }}</ion-note>
                  <ion-badge color="success">{{ translate("Approved") }}</ion-badge>
                </div>
              </section>
  
              <section>
                <div class="list-item">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <Image src="" />
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      {{ "Primary identifier" }}
                      <p class="overline">{{ "Secondary identifier" }}</p>
                    </ion-label>
                  </ion-item>

                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ "200" }}
                      <p>{{ translate("ordered") }}</p>
                    </ion-label>
                  </div>

                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ "170" }}
                      <p>{{ translate("shipped") }}</p>
                    </ion-label>
                  </div>

                  <div class="tablet ion-text-center">
                    <ion-label>
                      {{ "150" }}
                      <p>{{ translate("received") }}</p>
                    </ion-label>
                  </div>

                  <ion-item lines="none">
                    <ion-badge slot="end" color="success">{{ translate("Approved") }}</ion-badge>
                  </ion-item>
                </div>
              </section>
              <hr />
            </div>
          </div>
        </main>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="router.push('/create-order')">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar } from '@ionic/vue';
import { addOutline, documentTextOutline, downloadOutline, filterOutline, sendOutline, swapVerticalOutline } from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components'
import router from '@/router';
</script>

<style scoped>
.sort {
  margin: var(--spacer-sm) 0;
}

.metadata {
  text-align: end;
}

.metadata > ion-note {
  display: block;
}

main > div{
  cursor: pointer;
}

.section-header {
  display: grid;
  grid-template-areas: "info metadata"
                       "tags tags";
  align-items: center;                     
  margin: 0 var(--spacer-sm);
}

.primary-info {
  grid-area: info;
}

.tags {
  grid-area: tags;
  justify-self: center;
}

.list-item {
  --columns-tablet: 4;
  --columns-desktop: 5;
}

/* Added width property as after updating to ionic7 min-width is getting applied on ion-label inside ion-item
which results in distorted label text and thus reduced ion-item width */
.list-item > ion-item {
  width: 100%;
}

@media (min-width: 991px) {
  ion-content {
    --padding-bottom: 80px;
  }

  .section-header {
    grid: "info tags metadata" / 1fr max-content 1fr;
  }

  .tablet {
    display: unset;
  }

  .find {
    margin-right: 0;
  }

  .info {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(314px, max-content));
    align-items: start;
    grid-area: cards;
  }

  .sort {
    display: flex;
    justify-content: end;
  }

  .sort  > ion-item {
    flex: 0 1 343px;
    border-left: var(--border-medium);
  }
}
</style>