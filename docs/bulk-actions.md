# Bulk Actions for Transfer Orders

## Overview
This feature allows administrators and warehouse operators to perform high-volume actions on Transfer Orders (TOs) directly from the application. Instead of managing items individually, users can select multiple items across different orders (or within the same order) to fulfill or receive them in bulk.

## Business Use Case
In busy warehouse environments, operators often handle dozens of transfer orders daily. Validating each item individually is time-consuming. Bulk actions streamline the "Pick-Pack-Ship" (Fulfillment) and "Receive" workflows.

## Validation Rules
Bulk actions are governed by the `OrderActionValidator`. An action is only available if both the Order and the Item are in a valid state.

### 1. Bulk Fulfillment
Allows items to be marked as fulfilled (shipped). 

| Entity | Status Requirements |
| :--- | :--- |
| **Order Status** | `ORDER_APPROVED` |
| **Item Status** | `ITEM_APPROVED` or `ITEM_PENDING_FULFILL` |

**Logic**:
- The system checks each selected item against `OrderActionValidator.validateItemAction(order, item, 'FULFILL')`.
- If any item fails validation, the bulk action should either skip that item or alert the user.
- **Note**: Items in `ITEM_CREATED` status must be approved before they can be fulfilled.

### 2. Bulk Receipt
Allows items to be marked as received.

| Entity | Status Requirements |
| :--- | :--- |
| **Order Status** | `ORDER_APPROVED` |
| **Item Status** | `ITEM_PENDING_FULFILL` or `ITEM_PENDING_RECEIPT` |

**Logic**:
- The system checks each selected item against `OrderActionValidator.validateItemAction(order, item, 'RECEIVE')`.
- Items in `ITEM_PENDING_FULFILL` can be received directly in flows where fulfillment is implicit or skipped (e.g., `TO_Receive_Only`).

## UI/UX Considerations

### Selection
- A checkbox column in the items list to allow multiple selection.
- A "Select All" checkbox in the header that only selects items that are valid for the *currently active filter* or *pending action*.

### Action Trigger
We should add bulk action buttons to the bottom of the page using a ion-footer.
the footer will have the folowing buttons:
- Bulk Fulfill (if no items are selected then say all, and if some are seelected then show the count selected)
- Bulk Receive (if no items are selected then say "all" and if some are selected then show the count selected)
- Cancel
- 

### Feedback
- A modal should appear when the user clicks on any of the bulk action buttons. 
- A summary modal after completion showing:
    - Successfully processed items.
    - Failed items with reasons (e.g., "Item status changed by another user").

## Technical Check
The frontend should use the `OrderActionValidator` to filter the initial list or disable selection for items that do not meet the criteria for the chosen action.

> [!NOTE]
> Bulk actions should respect the user's facility permissions. An admin must have 'Fulfillment' or 'Receipt' permissions at the specific origin or destination facility.
