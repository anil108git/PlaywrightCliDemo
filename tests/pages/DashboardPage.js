const { expect } = require('@playwright/test');

class DashboardPage {
  constructor(page) {
    this.page = page;
    this.productCards = page.locator('.card');
    this.signOutButton = page.getByRole('button', { name: 'Sign Out' });
    this.productHeadings = page.locator('.card h5');
  }

  async getProductCount() {
    return await this.productCards.count();
  }

  async getProductNames() {
    return await this.productHeadings.allTextContents();
  }

  async signOut() {
    await this.signOutButton.click();
  }
}

module.exports = { DashboardPage };
