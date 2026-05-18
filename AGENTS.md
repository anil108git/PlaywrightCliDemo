# Project Context — PlaywrightCLIDemo

Playwright test automation with Page Object Model (POM) using CommonJS.

## Fixed Conventions (never change)

- **Module system:** CommonJS (`require`/`module.exports`). `package.json` has `"type": "commonjs"`.
- **Test files:** `tests/*.spec.js` in PascalCase. UI → `tests/<Feature>test.spec.js`, API → `tests/api/<Feature>.api.spec.js`.
- **Page objects:** `tests/pages/<PageName>.js` — class, locators in `constructor(page)`, `async` methods.
- **Page Object Manager:** `tests/pages/POManager.js` — facade with `get<Name>Page()` accessors.
- **Config:** `tests/config/index.js` loads `.env` + `tests/config/test-data/{env}.json`. Import via `const { credentials, urls, ui } = require('../config')`.
- **Custom fixtures:** `tests/fixtures/index.js` extends base test. Import `{ test, expect }` from `../fixtures`, NOT from `@playwright/test`.
- **Auth header format:** API uses `authorization: <raw-token>` (lowercase, no `Bearer ` prefix).
- **Never delete commented sections** in spec files. Comment blocks at the top document intentionally skipped tests — preserve them.

## Workflow

### 1. Analyze a page
1. `npx playwright-cli open <url>` and login if needed
2. `npx playwright-cli snapshot --boxes` to capture element refs
3. `npx playwright-cli requests` to find API endpoints
4. `npx playwright-cli console` to check warnings/errors
5. Try positive + negative interactions to capture states

### 2. Create/update page object
- File: `tests/pages/<PageName>.js`
- Locators: `page.locator('#id')`, `page.getByRole()`, etc.
- Methods: one `async` method per user interaction
- Import config: `const { urls, credentials } = require('../config');`
- **Register new page in POManager.js** — add `constructor` instantiation + `get<Name>Page()` accessor so `poManager` fixture can reach it.

### 3. Create UI tests
- File: `tests/<Feature>test.spec.js`
- Header imports only: fixtures + config.
- Use `poManager` fixture (auto-creates POManager from `page`):
  ```js
  test('TC_X: description @smoke @regression @ui', async ({ page, poManager }) => {
    await poManager.getLoginPage().goto();
    // ... steps
  });
  ```
- Use `loggedInPage` fixture when test needs pre-logged-in dashboard state.
- Never hardcode URLs — add to `tests/config/test-data/{env}.json` (add to **all 3** env files: `dev.json`, `staging.json`, `prod.json`).
- Tag with `@smoke @regression @ui`.

### 4. Create API tests
- File: `tests/api/<Feature>.api.spec.js`
- Use `request` fixture (no browser) for direct API calls.
- Use `authToken` fixture when test needs an authenticated session.
- Never hardcode endpoints — add to `tests/config/test-data/{env}.json` (add to **all 3** env files: `dev.json`, `staging.json`, `prod.json`).
- Tag with `@smoke @api` or `@regression @api`.

### 5. Fix a broken test
1. `npx playwright test --grep "TC_FAILING" --trace on` to capture trace
2. `npx playwright show-trace test-results/.../trace.zip` to inspect network + console
3. If locator is stale: use `npx playwright-cli snapshot --boxes` on the page to find updated refs
4. If endpoint changed: `npx playwright-cli requests` to discover new endpoint, add to all 3 env JSON files
5. Fix locator/assertion in page object or spec file
6. Re-run the single test to confirm fix

## Test case rules

### Automate only if:
- Repeatable, deterministic, provides meaningful coverage (positive flows, validations, edge cases, UI element presence, navigation).

### Do NOT automate:
- Visual design/colour checks, manual-only workflows, CAPTCHA, one-time edge cases, tests requiring human judgement, features blocked by environment.

### Skipped test documentation:
- Add a comment block at the top of the spec file (after imports) listing each skipped scenario with the reason.
  ```js
  // DB_S01: not automated — requires SMS OTP which cannot be bypassed in test environment
  ```

## Areas of Confusion & Solutions

| Confusion | Why it happened | Fix applied |
|---|---|---|
| **Hardcoded URL in `dashboard.api.spec.js`** | AGENTS.md said "import config" but didn't explicitly forbid hardcoding | Added explicit rule: "Never hardcode URLs/endpoints — add to {env}.json" |
| **Fixture usage mixed with manual setup** | Old guide showed `let poManager` + `test.beforeEach` pattern alongside fixture usage | Removed old pattern; now only fixture-based pattern is documented |
| **Skipped test comments were removed** | No rule existed protecting comment blocks during edits | Added "Never delete commented sections" as a fixed convention |
| **Duplicate guidance spread across sections** | "Conventions", "How to generate", and "Test case selection" overlapped | Merged into 3 clean tiers: Fixed Conventions → Workflow → Test case rules |
| **New page object not added to POManager.js** | Step 2 said "create page object" but didn't mention registration | Added explicit instruction: "Register new page in POManager.js" |
| **New endpoint added to only 1 env JSON** | Wording said "add to {env}.json" — ambiguous which ones | Clarified: "add to all 3 env files: dev.json, staging.json, prod.json" in both UI and API sections |
| **No debug workflow for broken tests** | Only creation guidance existed; fixing was undocumented | Added "5. Fix a broken test" with trace → inspect → snapshot → fix → re-run steps |
