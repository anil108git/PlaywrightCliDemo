const { test, expect } = require('../fixtures');
const { credentials, urls } = require('../config');

const apiLoginUrl = urls.apiLogin;

test.describe('Login API Tests', () => {

  test('TC17: Verify login API returns auth token for valid credentials @smoke @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userEmail: credentials.validEmail, userPassword: credentials.validPassword }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(body.token).toBeTruthy();
    expect(typeof body.token).toBe('string');
  });

  test('TC18: Verify login API returns 400 for invalid credentials @regression @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userEmail: credentials.invalidEmail, userPassword: credentials.invalidPassword }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

  test('TC19: Verify login API returns 400 for empty credentials @regression @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userEmail: '', userPassword: '' }
    });

    expect(response.status()).toBe(400);
  });

  test('TC20: Verify login API returns 400 for missing password field @regression @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userEmail: credentials.validEmail }
    });

    expect(response.status()).toBe(400);
  });

  test('TC21: Verify login API returns 400 for missing email field @regression @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userPassword: credentials.validPassword }
    });

    expect(response.status()).toBe(400);
  });

  test('TC22: Verify login API rejects SQL injection in email @regression @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userEmail: credentials.sqlInjectionEmail, userPassword: credentials.validPassword }
    });

    expect(response.status()).toBe(400);
  });

  test('TC23: Verify login API returns correct content-type header @regression @api', async ({ request }) => {
    const response = await request.post(apiLoginUrl, {
      data: { userEmail: credentials.validEmail, userPassword: credentials.validPassword }
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toContain('application/json');
  });

  test('TC24: Verify authToken fixture provides a valid token @smoke @api', async ({ authToken }) => {
    expect(authToken).toBeTruthy();
    expect(typeof authToken).toBe('string');
  });

  test('TC26: Verify authToken can create an authenticated API context @regression @api', async ({ playwright, authToken }) => {
    const apiContext = await playwright.request.newContext({
      baseURL: urls.base,
      extraHTTPHeaders: { authorization: authToken }
    });
    const response = await apiContext.post(urls.apiGetAllProducts);
    expect(response.status()).toBe(200);
    await apiContext.dispose();
  });

});
