const { test, expect } = require('@playwright/test');
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

});
