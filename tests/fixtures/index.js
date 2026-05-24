const { test: base, expect } = require('@playwright/test');
const { POManager } = require('../pages/POManager');
const { credentials, urls } = require('../config');

let cachedToken = null;

const test = base.extend({

  poManager: async ({ page }, use) => {
    const poManager = new POManager(page);
    await use(poManager);
  },

  authToken: [async ({ playwright }, use) => {
    if (!cachedToken) {
      const request = await playwright.request.newContext();
      const response = await request.post(urls.apiLogin, {
        data: { userEmail: credentials.validEmail, userPassword: credentials.validPassword }
      });
      const body = await response.json();
      cachedToken = body.token;
      await request.dispose();
    }
    await use(cachedToken);
  }, { scope: 'worker' }],

  loggedInPage: async ({ page }, use) => {
    const poManager = new POManager(page);
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.validEmail, credentials.validPassword);
    await page.waitForURL(/dashboard/);
    await use(page);
  },

});

module.exports = { test, expect };
