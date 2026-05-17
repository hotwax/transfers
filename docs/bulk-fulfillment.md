# Bulk Fulfillment from Transfer Order Detail

## Goal

Add an admin quick-ship action to the Transfer Order Detail page so users can fulfill transfer inventory without leaving the Transfers app.

The operator goal is simple: select eligible transfer order items, confirm the quantities to fulfill, and let the app create and ship the outbound transfer shipment directly. The admin-maintenance goal is just as important: if someone already created a transfer shipment and left it unshipped, admins should be able to find it, resume it, ship it, or cancel it from this same page.

This complements the existing bulk receive flow. Receiving moves inventory into the destination facility; bulk fulfillment moves inventory out of the origin facility.

## Current State

The Transfers app already has the beginning of this flow:

- `OrderDetail.vue` opens `BulkReceiveModal` with `actionType: "FULFILL"` for the footer bulk action.
- `BulkReceiveModal.vue` builds a fulfillment payload for selected items.
- `OrderService.ts` already exposes:
  - `POST poorti/transferShipments`
  - `POST poorti/transferShipments/{shipmentId}/ship`
  - `GET poorti/transferShipments`
  - `GET poorti/shippingRate/`
  - `PUT poorti/updateRouteShipmentCarrierAndMethod`
  - `POST poorti/shipments/retryShippingLabel`

The current implementation creates a transfer shipment and immediately ships it. This matches the transfer-order path in the fulfillment app, which does not call a separate pack API for transfer shipments.

## Fulfillment App Reference

The fulfillment app has two relevant patterns.

### Transfer shipment flow

For transfer orders, the fulfillment app creates an outbound transfer shipment and then routes the user to the transfer shipment shipping screen.

Create shipment:

```http
POST poorti/transferShipments
```

Payload shape used by the fulfillment app:

```json
{
  "payload": {
    "orderId": "M114944",
    "packages": [
      {
        "items": [
          {
            "orderItemSeqId": "00001",
            "productId": "10000",
            "quantity": 5,
            "shipGroupSeqId": "00001"
          }
        ]
      }
    ]
  }
}
```

Expected response:

```json
{
  "shipmentId": "S10000"
}
```

Ship shipment:

```http
POST poorti/transferShipments/{shipmentId}/ship
```

Payload shape used by the fulfillment app shipping screen:

```json
{
  "shipmentId": "S10000",
  "shipmentRouteSegmentId": "00001",
  "carrierPartyId": "FEDEX",
  "shipmentMethodTypeId": "SHIP_TO_STORE",
  "trackingIdNumber": "123456789"
}
```

For quick ship without tracking, the minimal payload may be:

```json
{
  "shipmentId": "S10000",
  "orderId": "M114944"
}
```

Tracking may be required for some carrier/method combinations. After the shipment is created, the UI should give the user the same choice as the fulfillment app's Ship Transfer Order page: generate/select live rates when available, or enter manual tracking details.

### Sales shipment pack/ship flow

The fulfillment app has explicit pack and ship APIs for sales shipments:

```http
POST poorti/shipments/{shipmentId}/pack
POST poorti/shipments/{shipmentId}/ship
POST poorti/shipments/bulkPack
POST poorti/shipments/bulkShip
```

Pack payload shape:

```json
{
  "shipmentId": "S10000",
  "orderId": "M114944",
  "facilityId": "STORE_1",
  "rejectedOrderItems": [],
  "shipmentPackageContents": [],
  "trackingCode": "123456789"
}
```

This is confirmed for sales shipment fulfillment only. Do not copy this pack step into transfer-order bulk fulfillment unless the fulfillment app starts doing the same for transfer shipments.

## Proposed Feature

Add **Bulk Fulfill** as a quick-ship admin workflow on the Transfer Order Detail page.

The flow should be:

1. User selects items, or leaves nothing selected to process all eligible visible items.
2. User clicks **Bulk Fulfill**.
3. App opens a modal that first shows any open transfer shipments already created for this order.
4. User either selects an open shipment to resume or chooses to start a new shipment.
5. If starting a new shipment, app opens the confirmation step with:
   - eligible item count
   - total units to fulfill
   - skipped item count, if any
   - origin facility
   - carrier and shipment method
6. User confirms.
7. App creates one outbound transfer shipment for the selected items.
8. App opens the shipping step for the selected or newly created shipment.
9. User either ships without tracking, selects/generates live-rate tracking, or enters manual tracking details.
10. App ships the shipment.
11. App refreshes order detail, timeline, discrepancy summary, and item status counts.

## Eligibility Rules

Use `OrderActionValidator.validateItemAction(order, item, "FULFILL")`.

Eligible order:

```text
statusId = ORDER_APPROVED
statusFlowId = TO_Fulfill_Only or TO_Fulfill_And_Receive
```

Eligible item:

```text
statusId = ITEM_APPROVED or ITEM_PENDING_FULFILL
remaining fulfillment quantity > 0
```

Skip:

- cancelled items
- completed items
- items with no remaining fulfillment quantity
- items that fail the validator
- items not in the active filtered/visible set when the user chooses bulk action for visible results

## Quantity Rules

Fulfill the remaining unfulfilled quantity:

```ts
remainingFulfillmentQty = Math.max(0, (item.quantity || 0) - (item.shippedQty || 0));
```

Payload item:

```json
{
  "orderItemSeqId": "00001",
  "productId": "10000",
  "quantity": 5,
  "shipGroupSeqId": "00001"
}
```

Do not include items where `quantity` resolves to `0`.

Do not offer custom quantities in the first implementation. Bulk fulfillment always fulfills the full remaining quantity for each eligible item.

## Open Shipment Validation

Before an open/hanging shipment can be shipped, compare what is booked on the shipment against what is still pending fulfillment on the current order item.

```ts
pendingFulfillmentQty = Math.max(0, (orderItem.quantity || 0) - (orderItem.shippedQty || 0));
bookedShipmentQty = sumShipmentItemQtyFor(orderItem.orderItemSeqId);
isOverbooked = bookedShipmentQty > pendingFulfillmentQty;
```

If any item on an open shipment is overbooked, the whole shipment is not shippable. This applies whether one item is overbooked or every item is overbooked.

In that state:

- do not allow live-rate shipping
- do not allow manual tracking shipping
- do not allow ship without tracking
- only allow **Cancel shipment**
- show the user which item quantities no longer match

Do not partially adjust and ship the old shipment. The admin should cancel the stale shipment, then start a new shipment for the current remaining fulfillment quantities.

## API Sequence

### 1. Fetch open transfer shipments

```http
GET poorti/transferShipments
```

Recommended query:

```json
{
  "orderId": "M114944"
}
```

The UI should treat any transfer shipment that is not `SHIPMENT_SHIPPED` and not `SHIPMENT_CANCELLED` as open/hanging.

Open shipment fields needed by the UI:

```json
{
  "shipmentId": "S10000",
  "statusId": "SHIPMENT_INPUT",
  "statusDate": 1777988670000,
  "packages": [
    {
      "items": [
        {
          "orderItemSeqId": "00001",
          "productId": "10000",
          "quantity": 5
        }
      ]
    }
  ],
  "routeSegCarrierPartyId": "FEDEX",
  "routeSegShipmentMethodTypeId": "SHIP_TO_STORE",
  "trackingIdNumber": ""
}
```

If the response shape differs, normalize it into:

```ts
{
  shipmentId: string;
  statusId: string;
  createdDate?: number;
  itemCount: number;
  unitCount: number;
  canShip: boolean;
  cancellationOnlyReason?: string;
  carrierPartyId?: string;
  shipmentMethodTypeId?: string;
  trackingIdNumber?: string;
}
```

### 2. Create outbound transfer shipment

```http
POST poorti/transferShipments
```

Recommended Transfers app payload:

```json
{
  "payload": {
    "orderId": "M114944",
    "packages": [
      {
        "items": [
          {
            "orderItemSeqId": "00001",
            "productId": "10000",
            "quantity": 5,
            "shipGroupSeqId": "00001"
          }
        ]
      }
    ]
  }
}
```

Notes:

- This matches the fulfillment app transfer shipment payload shape.
- The existing Transfers app fulfillment modal currently sends a flatter shape with `orderId`, `originFacilityId`, `shipmentTypeId`, and `items`. Prefer the fulfillment app shape unless backend confirms both contracts are supported.
- Create one shipment for all eligible selected items.

### 3. Update carrier/method/tracking before shipping

When the user selects a live rate, generates a label, or enters manual tracking details, update the shipment route before shipping.

```http
PUT poorti/updateRouteShipmentCarrierAndMethod
```

Manual tracking payload:

```json
{
  "shipmentId": "S10000",
  "shipmentRouteSegmentId": "00001",
  "carrierPartyId": "FEDEX",
  "shipmentMethodTypeId": "SHIP_TO_STORE",
  "trackingIdNumber": "123456789"
}
```

Live-rate/generated-label payload should follow the fulfillment app pattern and include any selected rate fields the backend expects, such as `carrierService` or `gatewayRateId`.

### 4. Ship transfer shipment

```http
POST poorti/transferShipments/{shipmentId}/ship
```

No-tracking quick-ship payload:

```json
{
  "shipmentId": "S10000",
  "orderId": "M114944"
}
```

If the user chooses manual tracking, use the fuller fulfillment-app payload:

```json
{
  "shipmentId": "S10000",
  "shipmentRouteSegmentId": "00001",
  "carrierPartyId": "FEDEX",
  "shipmentMethodTypeId": "SHIP_TO_STORE",
  "trackingIdNumber": "123456789"
}
```

### 5. Cancel hanging transfer shipment

Use this when the user exits a created shipment flow or explicitly cancels an existing hanging shipment.

```http
PUT poorti/shipments/{shipmentId}
```

Payload:

```json
{
  "statusId": "SHIPMENT_CANCELLED"
}
```

This matches the fulfillment app transfer shipment discard behavior.

## UI Behavior

Use the existing Order Detail footer action pattern.

Button:

```text
Bulk Fulfill
```

### Step 1: Choose Shipment

When the modal opens, show open/hanging transfer shipments first.

Open shipment list item content:

```text
Shipment S10000
3 items · 18 units
FedEx · Ship To Store
Created May 2, 2026, 3:42 PM
```

If the shipment is overbooked against current pending fulfillment quantity:

```text
Shipment S10000
3 items · 18 units
Cannot ship: shipment quantity exceeds pending fulfillment
Cancel shipment to continue
```

Actions:

- selecting a shippable open shipment moves directly to **Step 3: Ship Shipment**
- selecting an overbooked open shipment opens **Step 3: Ship Shipment** in cancellation-only mode
- **Start new shipment** moves to **Step 2: Confirm Fulfillment**
- if no open shipments exist, the modal can go directly to **Step 2: Confirm Fulfillment**

### Step 2: Confirm Fulfillment

Modal copy:

```text
You are about to fulfill 6 items.
6 items · 42 units
```

If some selected items cannot be fulfilled:

```text
2 selected items cannot be fulfilled and will be skipped.
```

Confirm action:

```text
Create shipment
```

### Step 3: Ship Shipment

After `POST poorti/transferShipments` succeeds, keep the modal open and move to a shipping step for the created `shipmentId`.

Use the same interaction model as the fulfillment app's Ship Transfer Order page:

- live rates / generated label path when available
- manual tracking path with carrier, shipment method, and tracking number
- ship without tracking only when the carrier/method does not require tracking

Manual tracking fields:

```text
Carrier
Shipping method
Tracking number
```

Manual tracking action:

```text
Ship shipment
```

This action must be disabled until required manual tracking fields are present. At minimum, disable it while `trackingIdNumber` is empty. If the user has not entered tracking details, the logical available action is **Ship without tracking**.

No-tracking action:

```text
Ship without tracking
```

Cancel action:

```text
Cancel shipment
```

Place **Cancel shipment** as a red action below **Ship without tracking**. It cancels the selected/generated shipment with `PUT poorti/shipments/{shipmentId}` and `statusId: "SHIPMENT_CANCELLED"`, refreshes the order, and closes or returns to the open shipment list.

If the shipment is overbooked against current pending fulfillment quantity, hide or disable all ship actions and show only **Cancel shipment** plus navigation back to the shipment list. Explain that the shipment can no longer be shipped because it contains more quantity than is currently pending fulfillment.

If the user closes the modal after a shipment has been created or selected but before it is shipped, do not drop them into a dead end. Show a confirmation that lets them either:

- return to the shipping step
- cancel the shipment and exit

Processing state:

```text
Loading open shipments...
Creating shipment...
Waiting for shipping details...
Shipping shipment...
Cancelling shipment...
Refreshing order...
```

Completion state:

```text
Successfully fulfilled 6 items.
```

Failure state:

```text
Shipment was created but could not be shipped.
```

When create succeeds but ship fails, stay inside the modal on an error state. Show the created `shipmentId`, the error message, and actions to retry shipping, go back to the shipping step, or cancel the shipment. Do not replace the modal with a generic error page.

## Page Placement for Hanging Shipments

Open/hanging transfer shipments should be visible on the Order Detail page so admins can resume imperfect operations.

### Timeline

If the order has transfer shipments that are not shipped and not cancelled, add an `ion-item` at the end of the timeline.

Suggested content:

```text
Open shipment
S10000 · 3 items · 18 units
Needs tracking or shipping
```

If at least one open shipment is cancellation-only because it is overbooked:

```text
Open shipment
S10000 · 3 items · 18 units
Needs cancellation
```

If more than one open shipment exists:

```text
Open shipments
2 shipments · 5 items · 22 units
Needs review
```

Clicking the timeline item opens the bulk fulfill modal at **Step 1: Choose Shipment**. If there is exactly one open shipment, the modal may preselect it and move directly to **Step 3: Ship Shipment**, but it should still allow the user to go back to the open shipment list.

### Bulk Fulfill Button

Clicking **Bulk Fulfill** should also open the same modal. The modal always shows open shipments first when they exist, along with **Start new shipment**.

This ensures both entry points lead to the same maintenance workflow:

- resume and ship an open shipment
- cancel an open shipment
- start a new shipment from remaining eligible items

## Refresh Requirements

After success:

- refetch transfer order detail
- refetch timeline
- refetch open transfer shipments
- reset selected item IDs
- update discrepancy summary
- update status counts

After partial failure:

- refetch order detail anyway
- refetch open transfer shipments
- keep the modal result visible
- show created shipment IDs and failed item counts

## Error Handling

Create shipment failure:

- Do not call ship.
- Mark the batch failed.
- Show backend error when available.

Ship failure:

- Show `shipmentId`.
- Keep the user in the modal.
- Offer **Back to shipping details**.
- Offer **Retry shipping** when the payload is still valid.
- Offer **Cancel shipment**.
- Refresh order detail before closing the modal.

Cancel shipment failure:

- Keep the user in the shipping step.
- Show the backend error.
- Keep **Cancel shipment** available for retry.

## Implementation Notes

Recommended service methods:

```ts
createTransferOrderShipment(payload)
shipTransferOrderShipment(payload)
fetchTransferShipmentDetail(params)
updateRouteShipmentCarrierAndMethod(payload)
fetchShippingRates(params)
retryShippingLabel(shipmentId)
cancelTransferOrderShipment(shipmentId)
```

Recommended component split:

- Keep receiving-specific mode choices in the receive modal.
- Add a dedicated `BulkFulfillModal.vue` because fulfillment is now a multi-step flow after shipment creation.
- Reuse the existing footer action and selection state from `OrderDetail.vue`.
- Reuse the fulfillment app Ship Transfer Order interaction pattern for live rates versus manual tracking.
- Add an Order Detail timeline entry for open transfer shipments.
- Keep the open shipment list and shipping step inside the same modal so both footer and timeline entry points share behavior.

Do not add custom CSS for the first implementation. Use Ionic components only:

- `ion-modal`
- `ion-header`
- `ion-toolbar`
- `ion-list`
- `ion-item`
- `ion-label`
- `ion-note`
- `ion-progress-bar`
- `ion-button`

## Decisions

1. Tracking may be required, so the modal must support a second shipping step after shipment creation.
2. Create one shipment for the selected eligible items.
3. Fulfill remaining quantities only. Do not support custom quantities in this feature.
4. No extra permission gate beyond being able to log into the Transfers app.
5. Open/hanging shipments must be surfaced on the page and inside the bulk fulfill modal.
6. Users must be able to cancel a generated or hanging shipment from the shipping step.
7. Manual tracking ship action is disabled until tracking details are present; no-tracking shipping stays a separate action.
8. If any item on an open shipment is booked for more than its current pending fulfillment quantity, that shipment is cancellation-only and cannot be shipped.
