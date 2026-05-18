# Project Context — PlaywrightCLIDemo

This is a Playwright test automation project using Page Object Model (POM) with CommonJS.

## Conventions

- **Module system:** CommonJS (`require`/`module.exports`). The project `package.json` has `"type": "commonjs"`.
- **Test files:** `tests/*.spec.js` (PascalCase, `.spec.js` suffix). UI tests in `tests/`, API tests in `tests/api/`.
- **Page objects:** `tests/pages/<Name>Page.js` — class with `constructor(page)`, locators defined in constructor, methods in `async` form.
- **Page Object Manager:** `tests/pages/POManager.js` — facade that instantiates all page objects and exposes `get<Name>Page()` accessors.
- **Config:** `tests/config/index.js` loads `.env` and environment-specific JSON from `tests/config/test-data/{env}.json`. All tests import `{ credentials, urls, ui }` from `../config`.
- **Tags:** Use `@smoke @regression @ui @api` in test names for filterability.
- **Base URL:** Set via `playwright.config.js` per project. UI projects use `urls.client`, API project uses `urls.base`.
- **Custom Fixtures:** `tests/fixtures/index.js` extends the base `test` object. Import `{ test, expect }` from `../fixtures` instead of `@playwright/test` when fixtures are needed.

## How to analyze a page for test generation

1. Open the page URL using playwright-cli (`npx playwright-cli open <url>`)
2. Take a snapshot: `npx playwright-cli snapshot --boxes`
3. Capture elements: identify textboxes, buttons, links, dropdowns, toasts, error messages
4. Capture network: `npx playwright-cli requests` to find API endpoints
5. Check console: `npx playwright-cli console` for errors/warnings
6. Try positive and negative interactions to capture error states

## How to generate test scripts

1. Create page object in `tests/pages/<PageName>.js` following existing pattern:
   - Locators using `page.locator('#id')` or `page.getByRole()` etc.
   - Methods for each user interaction
   - Import config: `const { urls, credentials } = require('../config');`

2. UI tests in `tests/<feature>test.spec.js`:
   - Import `{ test, expect }` from `../fixtures` (not from `@playwright/test`)
   - Import config: `const { credentials, urls } = require('../config');`
   - Use `poManager` fixture instead of manual `let poManager` + `test.beforeEach`:
     ```js
     test('description @smoke @regression @ui', async ({ page, poManager }) => {
       await poManager.getLoginPage().goto();
       // ... test steps
     });
     ```
   - Use `loggedInPage` fixture when a test needs to start already logged in on the dashboard
   - Tag tests with `@smoke @regression @ui`
   - Cover: positive flow, negative flow, edge cases, UI elements, navigation

3. API tests in `tests/api/<feature>.api.spec.js`:
   - Import `{ test, expect }` from `../fixtures` (not from `@playwright/test`)
   - Import config for credentials/URLs
   - Use `authToken` fixture when a test needs an authenticated session
   - Use `request` fixture (no browser, no `page`) for direct API calls
   - Tag with `@smoke @api` or `@regression @api`
   - **Never hardcode URLs or endpoints** — always add new API paths to `tests/config/test-data/{env}.json` and import via `const { urls } = require('../config')`

## Test case selection

- **Only automate test cases that add value** — prioritise scenarios that are repeatable, deterministic, and provide meaningful coverage (positive flows, validations, edge cases, UI element presence, navigation).
- **Do NOT automate** — visual design/colour checks, manual-only workflows, CAPTCHA, one-time edge cases, tests requiring human judgement, or features blocked by environment limitations.
- **Document skipped test cases** — when a feature or scenario is intentionally not automated, add a comment block at the top of the spec file (after the imports) explaining why (e.g. `// DB_S01: not automated — requires SMS OTP which cannot be bypassed in test environment`). This keeps the audit trail clear without polluting the test runner output.

## Test data

- All variable test data goes in `tests/config/test-data/{env}.json`
- The `ENV` env var selects which JSON is loaded (dev/staging/prod)
- `config/index.js` re-exports `{ urls, credentials, ui }`
