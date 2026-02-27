# Playwright Automation Scripting Guidelines

This document outlines the standard practices for writing stable, maintainable, and readable Playwright automation scripts. These guidelines are tailored for the **transfers** project ecosystem but represent our standard stack (Ionic + Vue).

## 1. Project Architecture

A well-organized automation suite follows a structured hierarchy:
- **`playwright/pages/`**: Contains Page Object Model (POM) classes. Each file represents a logical page or major component.
- **`playwright/tests/`**: Contains `.spec.js` files. Grouped by feature or user flow.
- **`playwright/fixtures/`**: Custom Playwright fixtures to simplify test setup.
- **`playwright/constants/`**: Shared data, URLs, and static strings.
- **`playwright/utils/`**: Helper functions for repeatable logic.

---

## 2. Page Object Model (POM) Standards

Every page or significant UI component must have a corresponding POM class to decouple test logic from UI selectors.

### 2.1 Implementation Pattern
- **Locators in Constructor**: Define all locators in the constructor for easy updates.
- **Action Methods**: Encapsulate complex interactions (like filling form + clicking save) into descriptive methods.
- **Assertions in Methods**: Use `await expect(...)` inside methods if the action implies a state transition (e.g., waiting for search results to appear).

### ✅ Example (Project POM)
```javascript
export class CreateOrderPage {
    constructor(page) {
        this.page = page;
        // Priority 1: Use Test IDs (as per testidguideline.md)
        this.saveBtn = page.getByTestId('create-order-save-btn');
        this.productSearchInput = page.getByTestId('create-order-product-search-input');
        
        // Priority 2: Use ARIA Roles if Test ID is not available
        this.transferNameInput = page.getByRole("textbox", { name: "Transfer name" });
    }

    async addProduct(sku) {
        await this.productSearchInput.fill(sku);
        // Web-first assertion: wait for search results in Vue component
        const searchResult = this.page.getByTestId('create-order-search-result-row');
        await expect(searchResult).toBeVisible();
        await this.page.getByTestId('create-order-add-product-btn').click();
    }
}
```

---

## 3. Locator Strategy

Prioritize locators that remain stable even when design or implementation details change.

| Priority | Locator | Reason |
| :--- | :--- | :--- |
| **1** | `page.getByTestId(id)` | Most stable. Tied to `data-testid` attributes. |
| **2** | `page.getByRole(role, { name })` | Reflects how users see the page (accessible). |
| **3** | `page.getByLabel(text)` | Ideal for form inputs with labels. |
| **4** | `page.getByText(text)` | Useful for static headings or success messages. |

### ❌ Avoid
- **Fragile Selectors**: CSS classes like `.btn-primary` or long XPaths.
- **Manual Waits**: `page.waitForTimeout(3000)` (Always use web-first assertions).

---

## 4. Assertions (Web-First)

Always use **Web-First Assertions**. These built-in assertions provide automatic waiting and high stability.

### ✅ Correct Usage
```javascript
// Retries automatically until visible
await expect(page.getByTestId('success-toast')).toBeVisible();

// Retries until text content matches in Ionic toast
await expect(page.locator('ion-toast')).toContainText("Operation successful");

// Condition check before action
await expect(this.saveBtn).toBeEnabled();
await this.saveBtn.click();
```

---

## 5. Understanding the Application Flow
Before writing any scripts, troubleshoot the feature flow manually.
- **Manual Run**: Perform a manual run to understand the user journey and feedback loops (toasts, modals).
- **Code Inspection**: Review the corresponding **.vue** files to identify:
    - **Edge Cases**: Conditional renders (`v-if`), disabled states, and error handling.
    - **Validation**: Identify required fields and expected error messages.
- **Consultation**: Documentation or AI can help explain complex business rules within the code.

---

## 6. Separate Positive and Negative Tests
To maintain clarity and better reporting, separate tests based on their intent:
- **Positive Tests**: Focused on the "happy path" (valid data).
- **Negative Tests**: Focused on boundary values, invalid inputs, and error states.
- **Unified POM**: Both high-level test files (e.g. `Transfers-Positive.spec.js`) should use the **same Page Object Model** classes.

---

## 7. Session Management & Reusability
Avoid logging in for every single test case to save time.
- **Store Login Session**: Use Playwright's `storageState` to save authentication cookies/local storage.
- **Implementation**: Configure `playwright/tests/auth.setup.js` to handle initial authentication.

---

## 8. Data Security & Environment Variables
Never hardcode sensitive information (credentials, API keys) in scripts.
- **Environment Variables**: Use a `.env` file and access via `process.env`.
- **Git Safety**: Ensure `.env` is listed in `.gitignore`.

---

## 9. Handling Multiple Tabs/Pages
Use `Promise.all` to catch new page events efficiently.
```javascript
const [newPage] = await Promise.all([
  context.waitForEvent('page'),
  page.getByRole('link', { name: 'External Link' }).click()
]);
await newPage.waitForLoadState();
```

---

## 10. Handling "Strict Mode Violation" Errors
Fails if a locator matches **more than one element**.
- **Solutions**: 
  - Use `.first()`, `.last()`, or `.nth(index)`.
  - Filter by text: `page.getByRole('button').filter({ hasText: 'Submit' })`.
  - Scope the locator: `page.getByTestId('container').getByRole('button')`.

---

## 11. Debugging Guidelines
- **`page.pause()`**: Opens the **Playwright Inspector** for step-by-step execution.
- **Screenshots & Videos**: Review automated captures in the `test-results/` folder on failure.
- **Traces**: Use the [Trace Viewer](https://trace.playwright.dev/) for deep DOM analysis.
- **Outer HTML**: If a locator fails, inspect the **Outer HTML** in DevTools to find unique attributes.

---

---

## 12. Handling Flakiness (Soft Assertions)
Often a test fails because one minor text check failed, but the rest of the flow was perfect. Using **Soft Assertions** prevents the test from terminating early.
- **Why**: `expect.soft()` allows the test to keep running even if a non-critical check fails. This helps you gather more information about other elements in a single test run.
- **Where NOT to use**: Do **not** use soft assertions for critical steps. If the "Login" button fails or a "Save" action doesn't trigger, the rest of the test is invalid. For these, use standard `expect()` to fail immediately.
- **Example**:
```javascript
// Test will continue even if these fail
await expect.soft(page.getByTestId('user-profile-title')).toBeVisible();
await expect.soft(page.locator('.user-email')).toHaveText('test@example.com');

// Test will fail at the end if any soft assertions failed
await page.getByRole('button', { name: 'Logout' }).click();
```

## 13. Handling Complex or Dynamic Elements (Fallback Strategies)
Sometimes standard locators like `getByTestId` fail because the element is deeply nested, generated by a third-party library, or part of a complex shadow DOM.

- **Where NOT to use**: Avoid fallback strategies if a direct `data-testid` is available or can be added. Fallbacks (like indexing or filtering) are more complex and slightly slower; always prefer the most direct locator first.
- **Strategy 1: Filter by State/Sub-element**: Use `.filter()` to narrow down a list of similar elements.
    - `page.getByRole('listitem').filter({ hasText: 'Specific Item' })`
    - `page.locator('.card').filter({ has: page.getByRole('button', { name: 'Delete' }) })`
- **Strategy 2: Chaining Locators**: Scope your search to a specific parent container first.
    - `this.container = page.getByTestId('order-list-container')`
    - `await this.container.getByRole('button').click()`
- **Strategy 3: CSS/XPath as Last Resort**: Only use these if the element is third-party and you cannot add a `data-testid`. Be as specific as possible to avoid breakage.
- **Strategy 4: Locate by Layout**: Use Playwright's layout selectors for elements without stable text/IDs.
    - `page.locator('input:right-of(:text("Order Number"))')`

---

## 14. Matches from Current Project
We've matched these guidelines with patterns already in the ecosystem:

| Current Pattern | Best Practice Correlation |
| :--- | :--- |
| **Toast Checks** | Using `expect(page.locator('ion-toast')).toContainText(...)` for Ionic validation. |
| **Complex Modals** | Methods like `assignOrigin()` in `CreateOrderPage.js` wrap multi-step Vue logic. |
| **Scoped Locators** | Using `page.getByText("Origin").getByRole("button")` to scope elements. |
| **Separate Spec Files** | Already have `Transfers-Negative.spec.js` separate from main flows. |

---

## 15. Summary Checklist for Code Reviews
- [ ] Has the flow been understood via manual run and **.vue** file check?
- [ ] Are positive and negative scenarios separated into different files?
- [ ] Is the test utilizing the shared POM and environment variables?
- [ ] Are multiple tabs handled using `Promise.all`?
- [ ] Does the test avoid "Strict Mode Violations"?
- [ ] Have you verified failures using `page.pause()` or Traces?
- [ ] Are **soft assertions** used for non-critical checks?
- [ ] Are **fallback strategies** (filtering/chaining) used for complex elements?
- [ ] Are all interactive elements using `data-testid`?
- [ ] Are all assertions web-first (`await expect`)?






