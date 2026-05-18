class DashboardPage {
  constructor(page) {
    this.page = page;

    this.productCards = page.locator('.card');
    this.productHeadings = page.locator('.card h5');
    this.productPrices = page.locator('.card .text-muted');
    this.addToCartButtons = page.locator('.card .btn:has-text("Add To Cart")');
    this.viewButtons = page.locator('.card .btn:has-text("View")');

    this.homeButton = page.getByRole('button', { name: 'HOME' });
    this.ordersButton = page.getByRole('button', { name: 'ORDERS' });
    this.cartButton = page.locator('nav').getByRole('button', { name: 'Cart' });
    this.signOutButton = page.getByRole('button', { name: 'Sign Out' });

    this.searchInput = page.getByPlaceholder('search').last();
    this.minPriceInput = page.getByPlaceholder('Min Price').last();
    this.maxPriceInput = page.getByPlaceholder('Max Price').last();

    this.resultsSummary = page.locator('text=Showing');
    this.pagination = page.locator('[aria-label="Pagination"]');
    this.dashboardPageContent = page.locator('.container');
  }

  async waitForDashboardReady() {
    await this.productCards.first().waitFor({ state: 'visible', timeout: 15000 });
  }

  async getProductCount() {
    return await this.productCards.count();
  }

  async getProductNames() {
    return await this.productHeadings.allTextContents();
  }

  async getProductPrices() {
    const count = await this.productCards.count();
    const prices = [];
    for (let i = 0; i < count; i++) {
      const card = this.productCards.nth(i);
      const priceText = await card.locator('.text-muted').textContent();
      prices.push(priceText.trim());
    }
    return prices;
  }

  getProductCardByName(productName) {
    return this.productCards.filter({ hasText: productName });
  }

  async addProductToCart(productName) {
    const card = this.getProductCardByName(productName);
    await card.getByRole('button', { name: 'Add To Cart' }).click();
  }

  async viewProduct(productName) {
    const card = this.getProductCardByName(productName);
    await card.getByRole('button', { name: 'View' }).click();
  }

  async searchProduct(query) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async filterByPriceRange(min, max) {
    if (min !== undefined) await this.minPriceInput.fill(String(min));
    if (max !== undefined) await this.maxPriceInput.fill(String(max));
  }

  async navigateToOrders() {
    await this.ordersButton.click();
  }

  async navigateToCart() {
    await this.cartButton.click();
  }

  async signOut() {
    await this.signOutButton.click();
  }
}

module.exports = { DashboardPage };
