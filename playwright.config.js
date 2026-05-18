import { defineConfig, devices } from '@playwright/test';

const ENV = process.env.ENV || 'dev';

const baseURLs = {
  dev: { base: 'https://rahulshettyacademy.com', client: 'https://rahulshettyacademy.com/client' },
  staging: { base: 'https://staging.rahulshettyacademy.com', client: 'https://staging.rahulshettyacademy.com/client' },
  prod: { base: 'https://rahulshettyacademy.com', client: 'https://rahulshettyacademy.com/client' },
};

const urls = baseURLs[ENV] || baseURLs.dev;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.js',
      use: {
        baseURL: urls.base,
      },
    },
    {
      name: 'ui-chromium',
      testIgnore: '**/api/**',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: urls.client,
      },
    },
  ],
});
