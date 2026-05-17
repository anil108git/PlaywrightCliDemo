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
   - Import POManager and config
   - Use `test.beforeEach` for navigation
   - Tag tests with `@smoke @regression @ui`
   - Cover: positive flow, negative flow, edge cases, UI elements, navigation

3. API tests in `tests/api/<feature>.api.spec.js`:
   - Use `request` fixture (no browser, no `page`)
   - Import config for credentials/URLs
   - Tag with `@smoke @api` or `@regression @api`

## Test data

- All variable test data goes in `tests/config/test-data/{env}.json`
- The `ENV` env var selects which JSON is loaded (dev/staging/prod)
- `config/index.js` re-exports `{ urls, credentials, ui }`
