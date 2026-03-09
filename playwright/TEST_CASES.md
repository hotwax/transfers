# Playwright Test Case Inventory

This file lists the current Playwright test cases in `playwright/tests`.

Total test cases: `51`

## 1. `bulk-actions.spec.ts`

1. `Bulk Receive: selected eligible items can be processed via modal`
2. `Select All: header checkbox selects only eligible items and becomes indeterminate when partially selected`
3. `Footer label changes for partial selection (close items vs close order)`
4. `Close fulfillment button is disabled when not currently allowed`
5. `Bulk receive stays disabled when no items are selected and re-disables after deselection`

## 2. `create-order-negative.spec.ts`

1. `Cannot submit order without items`
2. `Cannot submit order with missing transfer name`
3. `Cannot submit order with exact same origin and destination facility`
4. `Cannot submit order with 0 item quantity`
5. `Cannot add a non-existent product`
6. `Cannot submit order with missing assignment properties`

## 3. `create-order-positive.spec.ts`

1. `Create Fulfill & Receive transfer order using Book ATP logic`
2. `Create order using customized Ship Date`
 
## 4. `discrepancy.spec.ts`

1. `Summary shows discrepancy chips and filtering by Under shipped`
2. `Selecting All discrepancy resets filters and shows mixed statuses`
3. `Inline discrepancy badge exposes a title attribute (tooltip fallback)`
4. `Discrepancy filter chips can be toggled back to All without errors`

## 5. `order-action-logic.spec.ts`

1. `Approval button behavior matches order state`
2. `Cancel/Close Fulfillment buttons render valid enabled/disabled state`
3. `Add items button follows order status`
4. `Bulk receive button opens modal when enabled, otherwise stays non-actionable`
5. `Item-level meatball menu opens and shows at least one available action`
6. `Summary status chips are internally consistent with rendered item rows`
7. `Meatball menu redirects to external fulfill/receive apps when actions are available`
8. `Cancel action is blocked when order already has inventory impact`
9. `Bulk receive remains disabled until at least one eligible item is selected`
10. `Order detail status and summary chips persist after reload`

## 6. `settings.spec.ts`

1. `Settings page renders core sections`
2. `Timezone modal opens, supports search input, and can be dismissed`

## 7. `transfers-filters.spec.ts`

1. `Group by filter switches listing layout and keeps page stable`
2. `Sort by toggle updates icon state and keeps data fetch healthy`
3. `Location filters (store/origin/destination) can be applied and reset`
4. `Fulfillment filters (method/carrier/type/status) can be applied and reset`

## 8. `bulk-upload.spec.ts`

1. `Bulk upload page renders and submit is disabled before file upload`
2. `Uploading csv enables submit and allows field mappings`

## 9. `tabs-navigation.spec.ts`

1. `User can switch between Transfers, Discrepancies, and Settings tabs`

## 10. `order-detail-flows.spec.ts`

1. `Timeline section renders when timeline events exist`
2. `Clicking a clickable timeline event opens its detail modal`
3. `Timeline event row shows status text and optional time-diff text safely`
4. `Create order and add item from order detail Add Items modal`
5. `Close order end-to-end from order detail`
6. `Bulk receive end-to-end from order detail`
7. `Close fulfillment end-to-end from order detail (seeded impacted order)`
8. `Timeline updates after close-order action and survives page refresh`
9. `Bulk receive button enable/disable toggles with selection state`

## 11. `create-order-lifecycle-matrix.e2e.spec.ts`

1. `Lifecycle Fulfill_Receive: created and approved states follow expected action logic`
2. `Lifecycle Receive_Only: created and approved states follow expected action logic`
3. `Lifecycle Fulfill_Only: created and approved states follow expected action logic`
4. `Lifecycle gating: Receive only and Fulfill only hide opposite-direction actions in footer and meatball`
5. `Approved action state persists after reload for all lifecycle options`
6. `Approve action is idempotent when triggered repeatedly`
