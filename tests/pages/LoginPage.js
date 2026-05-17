const { expect } = require('@playwright/test');
const { urls, credentials } = require('../config');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('#userEmail');
    this.passwordInput = page.locator('#userPassword');
    this.loginButton = page.locator('#login');
    this.forgotPasswordLink = page.locator('.forgot-password-link');
    this.registerLink = page.locator('.login-wrapper-footer-text a');
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

  async loginWithApi(email, password) {
    const apiUrl = `${urls.base}${urls.apiLogin}`;
    const response = await this.page.request.post(apiUrl, {
      data: { userEmail: email, userPassword: password }
    });
    return response;
  }

  async getErrorMessage() {
    try {
      const toast = this.toastMessage;
      if (await toast.isVisible()) {
        return await toast.textContent();
      }
      return null;
    } catch {
      const bodyText = await this.page.locator('body').textContent();
      if (bodyText.includes('Incorrect') || bodyText.includes('invalid') || bodyText.includes('error')) {
        return bodyText;
      }
      return null;
    }
  }

  async isLoginButtonEnabled() {
    return await this.loginButton.isEnabled();
  }

  async getEmailPlaceholder() {
    return await this.emailInput.getAttribute('placeholder');
  }

  async getPasswordPlaceholder() {
    return await this.passwordInput.getAttribute('placeholder');
  }

  async clearEmail() {
    await this.emailInput.clear();
  }

  async clearPassword() {
    await this.passwordInput.clear();
  }

  async clearAllFields() {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickRegister() {
    await this.registerButton.click();
  }

  async clickRegisterLink() {
    await this.registerLink.click();
  }

  async getPageUrl() {
    return this.page.url();
  }

  async waitForDashboard() {
    await this.page.waitForURL(/dashboard/);
  }

  async isToastVisible() {
    try {
      await this.toastMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { LoginPage };
