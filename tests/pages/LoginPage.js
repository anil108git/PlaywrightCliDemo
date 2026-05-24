const { errors: playwrightErrors } = require('@playwright/test');
const { urls } = require('../config');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('#userEmail');
    this.passwordInput = page.locator('#userPassword');
    this.loginButton = page.locator('#login');
    this.forgotPasswordLink = page.locator('.forgot-password-link');
    this.registerButton = page.locator('.btn1');
    this.loginTitle = page.locator('.login-title');
    this.emailLabel = page.locator('label[for="email"]');
    this.passwordLabel = page.locator('label[for="password"]');
    this.toastMessage = page.locator('#toast-container');
  }

  async goto() {
    await this.page.goto(urls.login);
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getEmailPlaceholder() {
    return await this.emailInput.getAttribute('placeholder');
  }

  async getPasswordPlaceholder() {
    return await this.passwordInput.getAttribute('placeholder');
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickRegister() {
    await this.registerButton.click();
  }

  async isToastVisible() {
    try {
      await this.toastMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch (err) {
      if (err instanceof playwrightErrors.TimeoutError) return false;
      throw err;
    }
  }
}

module.exports = { LoginPage };
