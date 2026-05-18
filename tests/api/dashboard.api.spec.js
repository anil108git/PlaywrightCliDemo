const { test, expect } = require('../fixtures');
const { urls } = require('../config');

const apiGetAllProducts = urls.apiGetAllProducts;

test.describe('Dashboard - API Verification', () => {

  test('TC_DB11: Verify get-all-products API returns products @smoke @api', async ({ request }) => {
    const response = await request.post(apiGetAllProducts);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(0);
  });

});
