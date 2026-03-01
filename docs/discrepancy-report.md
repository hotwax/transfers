# Transfer Order Discrepancy Reporting

## Overview
This feature provides retail managers with filtered views on the Transfer Order Detail page to identify and resolve operational issues related to inventory movement.

## Business Use Case: Retail Manager
Retail managers need to ensure that inventory requested (Ordered) matches what is sent (Shipped) and what finally arrives (Received). Any discrepancy indicates a breakdown in the supply chain that requires immediate attention.

### Discrepancy Categories (Refined)

| Category | Definition | Constraint | Impact |
| :--- | :--- | :--- | :--- |
| **Under shipped** | `item.cancelQuantity > 0` | Fulfillment is **Closed/Completed** | Fulfillment failure at source; potential out-of-stocks. |
| **Under received** | `Received < Shipped` | Receipt is **Completed** | Lost in transit or counting error; inventory shrinkage. |
| **Over received** | `Received > Shipped` | None | Counting error or incorrect shipment; bloated inventory. |

> [!IMPORTANT]
> **Cancellation Exclusion**: Discrepancy reporting does NOT apply to orders that have been cancelled (`ORDER_CANCELLED`) or individual items with a cancelled status (`ITEM_CANCELLED`).

> [!IMPORTANT]
> **Pending Status Constraint**: Items still in progress (e.g., currently being picked or being received) are NOT considered "discrepancies" until the activity is declared finished by the operator.

---

## Proposed UI Plans

Add a new section title between "Timeline" and "Items" section. The title should be "Summary" and it will show the reviewer at a glance how a transfer order is performing. It will show the following metrics:

The two cards that are already there:
1. Fulfillments created
2. Receipts created

Then a discrpency card with the following metrics:
1. Total Under shipped Units (e.g., "12 units across 4 products").
2. Total Under received Units.
3. Total Over received Units.

From the summary section, the admin can filter the list of items below using **interactive radio cards**.
 
 If they want to see items by status they will be able to select from the **Status** card:
- **Options**: All, Pending fulfillment, Pending receipt, Completed.
- **Dynamic visibility**: Filters automatically adjust based on the order's `statusFlowId`.
 
 For discrepancies, the **Discrepancy** card functions as a primary filter:
- **Options**: All, Under shipped, Under received, Over received.
- **Interactive State**: Categories with no issues are disabled and show "No [category] items" helper text with a green checkmark. Categories with issues show aggregated metrics and an alert icon.
- **Interaction**: Selecting a filter updates the item list to show only items matching that category.

### 2. Inline Item Indicators
Visual feedback directly on the item cards.
- **Status Badges**: Small colored badges (e.g., Amber for Under shipped, Red for Under received) next to the quantity values.
- **Tooltip/Detail**: Clicking a discrepancy indicator could show a small popover explaining the expected vs. actual values.

---

## Technical Implementation (Logic)

### 1. Summary Metrics Calculation
These metrics are calculated across the entire `currentOrder.items` array to populate the Summary card.

```typescript
const isExcluded = (order, item) => order.statusId === 'ORDER_CANCELLED' || item.statusId === 'ITEM_CANCELLED';
const isReceiptFinished = (item) => item.statusId === 'ITEM_COMPLETED'; // Cancelled items already excluded

const summary = {
  underShipped: items.reduce((acc, item) => {
    if (!isExcluded(currentOrder, item) && item.cancelQuantity > 0) {
      acc.units += item.cancelQuantity;
      acc.products.add(item.productId);
    }
    return acc;
  }, { units: 0, products: new Set() }),
  
  underReceived: items.reduce((acc, item) => {
    if (!isExcluded(currentOrder, item) && isReceiptFinished(item) && item.receivedQty < item.shippedQty) {
      acc.units += (item.shippedQty - item.receivedQty);
      acc.products.add(item.productId);
    }
    return acc;
  }, { units: 0, products: new Set() }),

  overReceived: items.reduce((acc, item) => {
    if (!isExcluded(currentOrder, item) && item.receivedQty > item.shippedQty) {
      acc.units += (item.receivedQty - item.shippedQty);
      acc.products.add(item.productId);
    }
    return acc;
  }, { units: 0, products: new Set() })
};
```

### 2. Status Filtering
Filters shown in the "Summary" section depend on the `statusFlowId`.

| Status Flow | Visible Filters |
| :--- | :--- |
| `TO_Fulfill_Only` | All, Pending fulfillment, Completed |
| `TO_Receive_Only` | All, Pending receipt, Completed |
| `TO_Fulfill_And_Receive` | All, Pending fulfillment, Pending receipt, Completed |

### 3. Discrepancy Filtering
Logic applied when a discrepancy filter chip is selected:

```typescript
const filterItems = (items, filterType) => {
  if (currentOrder.statusId === 'ORDER_CANCELLED') return [];

  switch (filterType) {
    case 'UNDER_SHIPPED':
      return items.filter(item => !isExcluded(currentOrder, item) && isUnderShipped(item));
    case 'UNDER_RECEIVED':
      return items.filter(item => !isExcluded(currentOrder, item) && isUnderReceived(item));
    case 'OVER_RECEIVED':
      return items.filter(item => !isExcluded(currentOrder, item) && isOverReceived(item));
    default:
      return items;
  }
};
```

### Supporting APIs
1. **Order Detail API** (`GET /oms/transferOrders/{orderId}`): Main data source.
2. **Receipts History API** (`GET /poorti/transferOrders/{orderId}/receipts`): Audit trail.
3. **Mis-shipped Items API** (`GET /poorti/transferOrders/{orderId}/misShippedItems`): Identify extra items.
