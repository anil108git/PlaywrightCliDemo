const { test, expect } = require('../../fixtures');
const { urls } = require('../../config');

const apiGetAllProducts = urls.apiGetAllProducts;

test.describe('Dashboard - API Verification', () => {

  test('TC_DB11: Verify get-all-products API returns products with auth @smoke @api', async ({ request, authToken }) => {
    const response = await request.post(apiGetAllProducts, {
      headers: { authorization: authToken }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(0);
  });

});
