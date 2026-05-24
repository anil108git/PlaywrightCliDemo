const { test, expect } = require('../fixtures');
const { credentials, urls } = require('../config');

// Skipped (not automated) test cases for dashboard:
// DB_S01: Verify product card images load with correct dimensions — requires human visual judgment
// DB_S02: Verify button hover effects and cursor changes — visual CSS check, low value, brittle
// DB_S03: Verify page layout responsive at mobile/tablet widths — requires screenshot diffing
// DB_S04: Verify product images look appropriate for the product — subjective, requires human judgement
// DB_S05: Verify filter by category + sub-category + gender combination — Angular form state flakiness
// DB_S06: Verify Add To Cart adds product and updates cart badge — depends on cart module
// DB_S07: Verify empty product state when API returns no products — cannot reproduce reliably
// DB_S08: Verify pagination with 9+ products — API returns only 3 products, pagination non-functional
// DB_S09: Verify rapid double-click on Add To Cart — backend-dependent, limited value

test.describe('Positive Flow - Smoke Tests', () => {

  test('TC_DB1: Verify dashboard loads with correct URL after login @smoke @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.validEmail, credentials.validPassword);
    await page.waitForURL(/dashboard/);
    await poManager.getDashboardPage().waitForDashboardReady();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('TC_DB2: Verify product cards are displayed with correct count @smoke @regression @ui', async ({ loggedInPage, poManager }) => {
    const dashboardPage = poManager.getDashboardPage();
    await dashboardPage.waitForDashboardReady();
    const productCount = await dashboardPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
    const productNames = await dashboardPage.getProductNames();
    expect(productNames.length).toBe(productCount);
    productNames.forEach(name => {
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });

  test('TC_DB3: Verify all critical UI elements present on dashboard @smoke @regression @ui', async ({ loggedInPage, poManager }) => {
    const dashboardPage = poManager.getDashboardPage();
    await dashboardPage.waitForDashboardReady();
    await expect(dashboardPage.homeButton).toBeVisible();
    await expect(dashboardPage.ordersButton).toBeVisible();
    await expect(dashboardPage.cartButton).toBeVisible();
    await expect(dashboardPage.signOutButton).toBeVisible();
    await expect(dashboardPage.searchInput).toBeVisible();
    await expect(dashboardPage.minPriceInput).toBeVisible();
    await expect(dashboardPage.maxPriceInput).toBeVisible();
    await expect(dashboardPage.resultsSummary).toBeVisible();
    await expect(dashboardPage.pagination).toBeVisible();
  });

  test('TC_DB4: Verify each product has name, price, View and Add To Cart buttons @regression @ui', async ({ loggedInPage, poManager }) => {
    const dashboardPage = poManager.getDashboardPage();
    await dashboardPage.waitForDashboardReady();
    const count = await dashboardPage.getProductCount();
    for (let i = 0; i < count; i++) {
      const card = dashboardPage.productCards.nth(i);
      await expect(card.locator('h5')).toBeVisible();
      await expect(card.locator('.text-muted')).toBeVisible();
      await expect(card.getByRole('button', { name: 'View' })).toBeVisible();
      await expect(card.getByRole('button', { name: 'Add To Cart' })).toBeVisible();
    }
  });

});

test.describe('Navigation Tests', () => {

  test('TC_DB5: Verify clicking ORDERS navigates to orders page @regression @ui', async ({ loggedInPage, poManager }) => {
    await poManager.getDashboardPage().waitForDashboardReady();
    await poManager.getDashboardPage().navigateToOrders();
    await expect(loggedInPage).toHaveURL(/myorders/);
  });

  test('TC_DB6: Verify clicking Cart navigates to cart page @regression @ui', async ({ loggedInPage, poManager }) => {
    await poManager.getDashboardPage().waitForDashboardReady();
    await poManager.getDashboardPage().navigateToCart();
    await expect(loggedInPage).toHaveURL(/cart/);
  });

  test('TC_DB7: Verify Sign Out navigates back to login page @regression @ui', async ({ loggedInPage, poManager }) => {
    await poManager.getDashboardPage().waitForDashboardReady();
    await poManager.getDashboardPage().signOut();
    await expect(loggedInPage).toHaveURL(/login/);
  });

});

test.describe('Product Interaction Tests', () => {

  test('TC_DB8: Verify clicking View on a product opens product details page @regression @ui', async ({ loggedInPage, poManager }) => {
    const dashboardPage = poManager.getDashboardPage();
    await dashboardPage.waitForDashboardReady();
    const productNames = await dashboardPage.getProductNames();
    if (productNames.length > 0) {
      const firstProduct = productNames[0].trim();
      await dashboardPage.viewProduct(firstProduct);
      await expect(loggedInPage).toHaveURL(/product-details/);
    }
  });

});

test.describe('Edge Case Tests', () => {

  test('TC_DB9: Verify search input accepts text and filters results @regression @ui', async ({ loggedInPage, poManager }) => {
    const dashboardPage = poManager.getDashboardPage();
    await dashboardPage.waitForDashboardReady();
    const initialCount = await dashboardPage.getProductCount();
    await dashboardPage.searchProduct('ADIDAS');
    await dashboardPage.productCards.first().waitFor({ state: 'visible', timeout: 10000 });
    const filteredNames = await dashboardPage.getProductNames();
    expect(filteredNames.length).toBeGreaterThan(0);
    filteredNames.forEach(name => {
      expect(name.toUpperCase()).toContain('ADIDAS');
    });
  });

  test('TC_DB10: Verify minimum and maximum price inputs accept user values @regression @ui', async ({ loggedInPage, poManager }) => {
    const dashboardPage = poManager.getDashboardPage();
    await dashboardPage.waitForDashboardReady();
    await dashboardPage.filterByPriceRange(1000, 50000);
    await expect(dashboardPage.minPriceInput).toHaveValue('1000');
    await expect(dashboardPage.maxPriceInput).toHaveValue('50000');
    await dashboardPage.page.waitForTimeout(2000);
    const productPrices = await dashboardPage.getProductPrices();
    expect(productPrices.length).toBeGreaterThan(0);
    productPrices.forEach(priceText => {
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
      expect(price).toBeGreaterThanOrEqual(1000);
    });
  });

});
