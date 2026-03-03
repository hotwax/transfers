# Playwright tests

Run tests (after `npm install` and `npx playwright install`):

- Seed fixtures: `SEED_API_URL=https://your-seed.example.com node playwright/seed-fixtures.js`
- Run tests: `npx playwright test --config=playwright/playwright.config.ts`
- Run headed: `npx playwright test --config=playwright/playwright.config.ts --headed`

Auth:
- Provide `TEST_USERNAME` and `TEST_PASSWORD` env vars so global-setup saves `playwright/.auth/storageState.json`.
- Alternatively, pre-generate a storage state and place it in `playwright/.auth/storageState.json`.
Playwright test instructions

Prerequisites
- Node.js and npm installed
- Install dependencies: `npm install`
- Install Playwright browsers: `npx playwright install`

Run tests
- Headless (default):

```bash
npm run test:playwright
```

- Headed (debug):

```bash
npm run test:playwright:headed
```

View HTML report

```bash
npm run test:playwright:report
```

Notes
- The Playwright config will start the dev server (`npm run serve`) if one isn't already running.
- Provide `BASE_URL` env var to point tests to a different host, e.g. `BASE_URL=http://localhost:8081 npm run test:playwright`.
- For CI, seed deterministic fixtures and set environment variables for IDs used in the tests.

Seeding fixtures (optional)
- Provide an API endpoint that accepts test seed payloads via `SEED_API_URL`.
- Example (local):

```bash
SEED_API_URL=http://localhost:8080/api/test/seed node playwright/seed-fixtures.js
```

The script writes `playwright/test-fixtures.json` with created fixture IDs. Use those values as env vars for tests (e.g. `TEST_ORDER_ID`).

Auth / global setup
- To enable auto-login in Playwright global setup, set `TEST_USERNAME`, `TEST_PASSWORD`. The setup will navigate to `AUTH_LOGIN_PATH` (defaults to `/login`) and attempt to submit credentials and save `playwright/.auth/storageState.json`.
- If auth cannot be generated automatically the setup will create an empty storage file so tests won't fail with missing file, but you'll need to log in manually or provide a prepared storageState.
