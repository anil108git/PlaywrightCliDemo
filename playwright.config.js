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
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['json', { outputFile: 'test-results.json' }]]
    : 'html',
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },
  retries: process.env.CI ? 2 : 1,

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
