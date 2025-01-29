<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="`/tabs/transfers`" />
        <ion-title>{{ translate("Transfer order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <section class="header">
          <div class="id">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="ticketOutline" />
              <ion-label>
                <h1>{{ "Order Name" }}</h1>
              </ion-label>
              <ion-select></ion-select>
            </ion-item>
          </div>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ "Central warehouse" }}</ion-card-title>
              </ion-card-header>
              <ion-item lines="none">
                <ion-icon :icon="sendOutline" slot="start" />
                <ion-label>
                  <h3>{{ "Address line 1" }}</h3>
                  <h3>{{ "Address line 2" }}</h3>
                  <p>{{ "City, Zipcode" }}</p>
                  <p>{{ "State, Country" }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-select :label="translate('Method')" value="" interface="popover">
                  <ion-select-option value="">{{ "Next Day Shipping" }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item lines="none">
                <ion-select :label="translate('Carrier')" value="" interface="popover">
                  <ion-select-option value="">{{ "Fedex" }}</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Irvine Spectrum") }}</ion-card-title>
              </ion-card-header>
              <ion-item lines="none">
                <ion-icon :icon="downloadOutline" slot="start" />
                <ion-label>
                  <h3>{{ "Address line 1" }}</h3>
                  <h3>{{ "Address line 2" }}</h3>
                  <p class="overline">{{ "City, Zipcode" }}</p>
                  <p class="overline">{{ "State, Country" }}</p>
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
                <ion-button fill="clear" slot="end">
                  <ion-icon :icon="informationCircleOutline" slot="icon-only" />
                </ion-button>
              </ion-item>
            </ion-list>
          </div>
        </section>

        <section class="header">
          <ion-radio-group>
            <div class="info">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>{{ "Fulfillment" }}</ion-card-title>
                </ion-card-header>
                <ion-item>
                  <ion-radio>
                    <ion-label>
                      {{ "Shipment Id" }}
                      <p>{{ "tracking code" }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
                <ion-item>
                  <ion-radio>
                    <ion-label>
                      {{ "Shipment Id" }}
                      <p>{{ "tracking code" }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-card>
              
              <ion-card>
                <ion-card-header>
                  <ion-card-title>{{ translate("Receipts") }}</ion-card-title>
                </ion-card-header>
                <ion-item>
                  <ion-radio>
                    <ion-label>
                      {{ "Shipment Id" }}
                      <p>{{ "tracking code" }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-card>
            </div>
          </ion-radio-group>
          <div class="timeline">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Shipment details") }}</ion-card-title>
                <ion-button slot="end" fill="clear">
                  <ion-icon :icon="closeCircleOutline" slot="icon-only" />
                </ion-button>
              </ion-card-header>
              <ion-item>
                <ion-label>{{ translate("Shipped date") }}</ion-label>
                <ion-label slot="end">{{ "3:32pm 6th Dec 2021" }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Method") }}</ion-label>
                <ion-label slot="end">{{ "Next Day Shipping" }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Carrier") }}</ion-label>
                <ion-label slot="end">{{ "Fedex" }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-label>{{ translate("Tracking code") }}</ion-label>
                <ion-label slot="end">{{ "XASD234232" }}</ion-label>
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

            <div class="list-item">
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <Image src="" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  {{ "Parent product" }}
                  <p class="overline">{{ "Parent product id" }}</p>
                </ion-label>
              </ion-item>
              <div></div>
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
              <div></div>
              <div class="ion-text-center">
                <ion-item lines="none" slot="end">
                  <ion-label>
                    {{ "150" }}
                    <p>{{ translate("received") }}</p>
                  </ion-label>
                </ion-item>
              </div>
            </div>

            <div class="list-item">
              <ion-item lines="none">
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
                <ion-chip outline>
                  <ion-icon :icon="sendOutline" />
                  <ion-label>{{ "300" }}</ion-label>
                </ion-chip>
              </div>
              <div class="tablet ion-text-center">
                <ion-chip outline>
                  <ion-icon :icon="downloadOutline" />
                  <ion-label>{{ "200" }}</ion-label>
                </ion-chip>
              </div>
              <ion-badge color="success">{{ translate("Approved") }}</ion-badge>
              <ion-button fill="clear">
                <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
              </ion-button>
            </div>
            <div class="list-item">
              <ion-item lines="none">
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
                <ion-chip outline>
                  <ion-icon :icon="sendOutline" />
                  <ion-label>{{ "300" }}</ion-label>
                </ion-chip>
              </div>
              <div class="tablet ion-text-center">
                <ion-chip outline>
                  <ion-icon :icon="downloadOutline" />
                  <ion-label>{{ "200" }}</ion-label>
                </ion-chip>
              </div>
              <ion-badge color="success">{{ translate("Approved") }}</ion-badge>
              <ion-button fill="clear">
                <ion-icon :icon="ellipsisVerticalOutline" slot="icon-only" />
              </ion-button>
            </div>
            <hr />
          </div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton,IonBadge, IonButton, IonCard, IonCardHeader, IonCardTitle, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRadio, IonRadioGroup, IonSelect, IonSelectOption, IonThumbnail, IonTitle, IonToolbar } from "@ionic/vue";
import { translate } from '@hotwax/dxp-components';
import { ellipsisVerticalOutline, ticketOutline, sunnyOutline, checkmarkDoneOutline, downloadOutline, sendOutline, shirtOutline, informationCircleOutline, closeCircleOutline } from "ionicons/icons";
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
