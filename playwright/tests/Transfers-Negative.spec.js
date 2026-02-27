import { test, expect } from "@playwright/test";
import { CreateOrderPage } from "../pages/CreateOrderPage";
import { TransfersPage } from "../pages/TransfersPage";

/**
 * @test Create Order Negative Scenarios
 * @objective Verify that the system correctly handles invalid data entry and prevents order creation with missing requirements.
 * 
 * @scenario 1: Attempt to create order without required fields
 * 1. Navigate to Create Order page.
 * 2. Leave name, store, origin, and destination empty.
 * 3. Click Save.
 * 4. Verify validation toast message: "Please select all the required properties assigned to the order."
 * 
 * @scenario 2: Attempt to create order with same Origin and Destination
 * 1. Navigate to Create Order page.
 * 2. Select same facility for both Origin and Destination.
 * 3. Add a product and name the order.
 * 4. Click Save.
 * 5. Verify validation toast message: "Origin and destination facility can't be same."
 * 
 * @scenario 3: Attempt to create order with negative item quantity
 * 1. Navigate to Create Order page.
 * 2. Fill all required header fields.
 * 3. Add a product.
 * 4. Set product quantity to -5.
 * 5. Click Save.
 * 6. Verify validation toast message: "Order items must have a valid ordered quantity."
 * 
 * @scenario 4: Search for non-existent product
 * 1. Navigate to Create Order page.
 * 2. Enter a random/invalid SKU string in product search.
 * 3. Verify empty state message: "No product found"
 */

test.describe("Negative Testing | Transfer Order Flow", () => {
    let createOrderPage;

    test.beforeEach(async ({ page }) => {
        createOrderPage = new CreateOrderPage(page);
        await createOrderPage.goto();
    });

    test("Negative | Create order without required metadata", async ({ page }) => {
        // Leave fields empty and click save
        await createOrderPage.clickSave();

        // According to CreateOrder.vue lines 517-520, it shows a toast
        // We'll verify the message appears
        await expect(page.locator('ion-toast')).toContainText("Please select all the required properties");
    });

    test("Negative | Origin and Destination cannot be same", async ({ page }) => {
        await createOrderPage.setTransferName("Bad Route Test");
        await createOrderPage.selectProductStore("Demo Store");

        // Assign same facility (e.g., 'central') to both
        await createOrderPage.assignOrigin("central", "Central Warehouse");
        await createOrderPage.assignDestination("central", "Central Warehouse");

        await createOrderPage.addProduct("MH09");
        await createOrderPage.setQuantity(5);
        await createOrderPage.selectLifecycle("Fulfill & Receive");

        await createOrderPage.clickSave();

        // According to CreateOrder.vue lines 522-525
        await expect(page.locator('ion-toast')).toContainText("Origin and destination facility can't be same");
    });

    test("Negative | Order items must have positive quantity", async ({ page }) => {
        await createOrderPage.setTransferName("Negative Quantity Test");
        await createOrderPage.selectProductStore("Demo Store");
        await createOrderPage.assignOrigin("central", "Central Warehouse");
        await createOrderPage.assignDestination("A221", "A221");

        await createOrderPage.addProduct("MH09");
        await createOrderPage.setQuantity(-10);
        await createOrderPage.selectLifecycle("Fulfill & Receive");

        await createOrderPage.clickSave();

        // According to CreateOrder.vue lines 528-532
        await expect(page.locator('ion-toast')).toContainText("Order items must have a valid ordered quantity");
    });

    test("Negative | Create order with no items", async ({ page }) => {
        await createOrderPage.setTransferName("Empty Items Test");
        await createOrderPage.selectProductStore("Demo Store");
        await createOrderPage.assignOrigin("central", "Central Warehouse");
        await createOrderPage.assignDestination("A221", "A221");
        // Don't add any products
        await createOrderPage.clickSave();
        // According to CreateOrder.vue lines 507-510
        await expect(page.locator('ion-toast')).toContainText("Please add atleast one item");
    });

    test("Negative | Missing transfer order lifecycle", async ({ page }) => {
        await createOrderPage.setTransferName("No Lifecycle Test");
        await createOrderPage.selectProductStore("Demo Store");
        await createOrderPage.assignOrigin("central", "Central Warehouse");
        await createOrderPage.assignDestination("A221", "A221");
        await createOrderPage.addProduct("MH09");
        await createOrderPage.setQuantity(10);
        // Lifecycle left unselected
        await createOrderPage.clickSave();
        // According to CreateOrder.vue lines 534-537
        await expect(page.locator('ion-toast')).toContainText("Please select transfer order lifecycle");
    });

    test("Negative | Item quantity cannot be zero", async ({ page }) => {
        await createOrderPage.setTransferName("Zero Quantity Test");
        await createOrderPage.selectProductStore("Demo Store");
        await createOrderPage.assignOrigin("central", "Central Warehouse");
        await createOrderPage.assignDestination("A221", "A221");
        await createOrderPage.addProduct("MH09");
        await createOrderPage.setQuantity(0);
        await createOrderPage.selectLifecycle("Fulfill & Receive");
        await createOrderPage.clickSave();
        // According to CreateOrder.vue lines 528-532
        await expect(page.locator('ion-toast')).toContainText("Order items must have a valid ordered quantity");
    });

    test("Negative | Product not found display", async ({ page }) => {
        await createOrderPage.page.getByTestId('create-order-product-search-input').fill('INVALID_SKU_123');
        // Wait for debounce and API
        await expect(page.getByTestId('create-order-product-not-found')).toBeVisible();
        await expect(page.getByTestId('create-order-product-not-found')).toContainText("No product found");
    });
});
