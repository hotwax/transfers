const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function seed() {
  const url = process.env.SEED_API_URL;
  if (!url) {
    console.warn('SEED_API_URL not provided; skipping seed.');
    return;
  }
  const payload = require('./fixtures/seed-payload.json');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  const out = path.resolve(__dirname, 'test-fixtures.json');
  fs.writeFileSync(out, JSON.stringify(json, null, 2));
  console.log('Seed wrote', out);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
const fs = require('fs');
const fetch = require('node-fetch');

// Simple fixture seeder. Configure via environment variables:
// SEED_API_URL - base url for seeding endpoint (e.g. http://localhost:8080/api/test/seed)
// If not provided, the script prints instructions and exits.

const seedUrl = process.env.SEED_API_URL;
const outFile = process.env.PLAYWRIGHT_FIXTURES_FILE || 'playwright/test-fixtures.json';

async function run() {
  if (!seedUrl) {
    console.log('No SEED_API_URL provided. To seed fixtures run:');
    console.log('SEED_API_URL=http://localhost:8080/api/test/seed node playwright/seed-fixtures.js');
    process.exit(0);
  }

  try {
    // Example payload - adjust to your API contract
    const payload = {
      orders: [
        {
          orderName: 'TEST_ORDER_AUTOGEN',
          statusId: 'ORDER_APPROVED',
          statusFlowId: 'TO_Fulfill_And_Receive',
          items: [
            { productId: 'P1', quantity: 10, statusId: 'ITEM_APPROVED' },
            { productId: 'P2', quantity: 5, statusId: 'ITEM_PENDING_RECEIPT' }
          ]
        }
      ]
    };

    const resp = await fetch(seedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.error('Seeding failed:', resp.status, await resp.text());
      process.exit(1);
    }

    const data = await resp.json();
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    console.log('Wrote fixtures to', outFile);
  } catch (err) {
    console.error('Error seeding fixtures:', err);
    process.exit(1);
  }
}

run();
