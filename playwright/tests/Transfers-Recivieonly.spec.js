import { test, expect } from "@playwright/test";
import { CreateOrderPage } from "../pages/CreateOrderPage";
import { OrderDetailPage } from "../pages/OrderDetailPage";

/**
 * @test Create receiving-only transfer order and approve
 * @objective Verify the end-to-end "Happy Path" of creating and approving a new transfer.
 * 
 * @scenario
 * 1. Navigate directly to the 'Create Transfer Order' page (bypassing login via session).
 * 2. Fill the order details (Name, Store, Origin/Destination).
 * 3. Configure the business logic (Lifecycle set to 'Receive only').
 * 4. Add a product (Product ID: MH09) and set the quantity.
 * 5. Submit the creation form.
 * 6. Verify data integrity on the Order Detail page (Status: Created, correct name, facility, and quantity).
 * 7. Transition order status from 'Created' to 'Approved'.
 * 8. Verify the final 'Approved' status.
 */

test("Sanity | Transfer App | Create receiving-only transfer order and approve", async ({ page }) => {
  const createOrderPage = new CreateOrderPage(page);
  const orderDetailPage = new OrderDetailPage(page);

  // --- PRE-CREATION SETUP ---

  // Step 1: Browse directly to the create-order route
  await createOrderPage.goto();
  await expect(page.getByText("Create transfer order")).toBeVisible();

  // Step 2: Input basic order metadata
  await createOrderPage.setTransferName("transfer order R1");
  await createOrderPage.selectProductStore("Demo Store");

  // Step 3: Define Stock Movement (Origin -> Destination)
  await createOrderPage.assignOrigin("central", "Central Warehouse");
  await createOrderPage.assignDestination("A221", "A221");

  // Step 4: Configure the specific business flow
  await createOrderPage.selectLifecycle("Receive only");
  await createOrderPage.selectTodayShipDate();

  // Step 5: Search and select inventory items
  await createOrderPage.addProduct("MH09");
  await createOrderPage.setQuantity(12);

  // Step 6: Submit to the server
  await createOrderPage.clickSave();

  // --- POST-CREATION VERIFICATION ---

  // Step 7: Confirm order state and data parity on the Detail page
  await orderDetailPage.verifyStatus("Created");
  await orderDetailPage.verifyOrderName("transfer order R1");
  await orderDetailPage.verifyItemExists("MH09");
  await orderDetailPage.verifyItemQuantity("MH09", 12);
  await orderDetailPage.verifyFacilityAssignment("Central Warehouse", "A221");

  // Step 8: Perform final workflow approval
  await orderDetailPage.approveOrder();

  // Step 9: Final status validation
  await orderDetailPage.verifyStatus("Approved");
});
