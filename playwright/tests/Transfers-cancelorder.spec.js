import { test, expect } from "@playwright/test";
import { TransfersPage } from "../pages/TransfersPage";
import { OrderDetailPage } from "../pages/OrderDetailPage";

/**
 * @test Cancel transfer order from Approved status
 * @objective Verify that existing Approved orders can be cancelled correctly via the Order Detail page.
 * 
 * @scenario
 * 1. Navigate to the main 'Transfer Orders' dashboard.
 * 2. Find any order that has an 'Approved' status and click to view its details.
 * 3. Verify landing on the Order Detail view (Route check).
 * 4. Confirm the initial status is 'Approved'.
 * 5. Update the status by selecting 'Cancel' from the dropdown.
 * 6. Explicitly handle the system's confirmation alert for cancellation.
 * 7. Verify the status updates to 'Cancelled'.
 */

test("Sanity | Transfer App | Cancel transfer order from Approved status", async ({ page }) => {
  const transfersPage = new TransfersPage(page);
  const orderDetailPage = new OrderDetailPage(page);

  // Step 1: Navigate to the Transfers home page (starts already logged-in)
  await transfersPage.goto();

  // Step 2: Use the dynamic locator to pick an order that is ready for cancellation
  await transfersPage.selectOrderWithStatus("Approved");

  // Step 3: Confirm we have navigated correctly to the detail page
  await expect(page).toHaveURL(/.*order-detail.*/);
  await orderDetailPage.verifyStatus("Approved");

  // Step 4: Perform the cancellation operation
  await orderDetailPage.cancelOrder();

  // Step 5: Final state check to confirm workflow termination
  await orderDetailPage.verifyStatus("Cancelled");
});
