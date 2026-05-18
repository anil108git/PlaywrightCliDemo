const { test: base, expect } = require('@playwright/test');
const { POManager } = require('../pages/POManager');
const { credentials, urls } = require('../config');

const test = base.extend({

  poManager: async ({ page }, use) => {
    const poManager = new POManager(page);
    await use(poManager);
  },

  authToken: async ({ request }, use) => {
    const response = await request.post(urls.apiLogin, {
      data: { userEmail: credentials.validEmail, userPassword: credentials.validPassword }
    });
    const body = await response.json();
    await use(body.token);
  },

  loggedInPage: async ({ page }, use) => {
    const poManager = new POManager(page);
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.validEmail, credentials.validPassword);
    await page.waitForURL(/dashboard/);
    await use(page);
  },

});

module.exports = { test, expect };
