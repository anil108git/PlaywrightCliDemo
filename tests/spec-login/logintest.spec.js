const { test, expect } = require('../fixtures');
const { credentials, urls } = require('../config');

// Skipped (not automated) test cases for login:
// TC_S01: Verify CAPTCHA appears after multiple failed attempts — cannot bypass CAPTCHA in test env
// TC_S02: Verify browser back button after login does not expose session — manual UX judgement
// TC_S03: Verify session token expiry redirects to login — requires long wait, low automation value
// TC_S04: Verify "Remember Me" checkbox persists session across browser restart — uses localStorage persistence
// TC_S05: Verify password visibility toggle shows/hides password — low risk, trivial UX check
// TC_S06: Verify login page layout is responsive on mobile viewports — requires screenshot diffing

test.describe('Positive Flow - Smoke Tests', () => {

  test('TC2: Verify successful login with valid credentials @smoke @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    const dashboardPage = poManager.getDashboardPage();
    await poManager.getLoginPage().login(credentials.validEmail, credentials.validPassword);
    await expect(page).toHaveURL(/dashboard/);
    await expect(dashboardPage.productCards.first()).toBeVisible({ timeout: 10000 });
    const productCount = await dashboardPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  });

  test('TC25: Verify successful login using loggedInPage fixture @smoke @regression @ui', async ({ loggedInPage }) => {
    await expect(loggedInPage).toHaveURL(/dashboard/);
  });

});

test.describe('Negative Flow - Validation Tests', () => {

  test('TC3: Verify login fails with invalid email format @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login('notanemail', credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC4: Verify login fails with incorrect password @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.validEmail, credentials.invalidPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC5: Verify login fails with empty email field @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login('', credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC6: Verify login fails with empty password field @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.validEmail, '');
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC7: Verify login fails with both fields empty @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login('', '');
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

});

test.describe('Edge Case Tests', () => {

  test('TC8: Verify system handles SQL injection-like input in email @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.sqlInjectionEmail, credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC9: Verify system handles XSS attempt in email field @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.xssEmail, credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC10: Verify login with email containing leading/trailing spaces @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(`  ${credentials.validEmail}  `, credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('TC11: Verify login with very long email input @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    const longEmail = credentials.longEmailPrefix.repeat(50) + '@test.com';
    await poManager.getLoginPage().login(longEmail, credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC12: Verify login with unicode/special characters in email @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.unicodeEmail, credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

  test('TC13: Verify login with email having special characters like +tag @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().login(credentials.plusTagEmail, credentials.validPassword);
    await expect(page).not.toHaveURL(/dashboard/);
    expect(page.url()).toContain('/auth/login');
  });

});

test.describe('UI Elements Verification', () => {

  test('TC14: Verify all critical UI elements are present on login page @regression @ui @jira-SCRUM-9', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    const loginPage = poManager.getLoginPage();

    await expect(loginPage.loginTitle).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.emailLabel).toHaveText('Your Email');
    await expect(loginPage.passwordLabel).toHaveText('Your Password');

    expect(await loginPage.getEmailPlaceholder()).toBe('email@example.com');
    expect(await loginPage.getPasswordPlaceholder()).toBe('enter your passsword');
  });

});

test.describe('Navigation Tests', () => {

  test('TC15: Verify forgot password link navigates to reset page @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().clickForgotPassword();
    await expect(page).toHaveURL(/password-new/);
  });

  test('TC16: Verify register link navigates to register page @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    await poManager.getLoginPage().clickRegister();
    await expect(page).toHaveURL(/register/);
  });

});
