# Project Context — PlaywrightCLIDemo

Playwright test automation with Page Object Model (POM) using CommonJS.

## Fixed Conventions (never change)

- **Module system:** CommonJS (`require`/`module.exports`). `package.json` has `"type": "commonjs"`.
- **Test files:** `tests/spec-<Module>/*.spec.js` in PascalCase. UI → `tests/spec-<Module>/<Feature>test.spec.js`, API → `tests/spec-<Module>/api/<Feature>.api.spec.js`.
- **Page objects:** `tests/pages/<PageName>.js` — class, locators in `constructor(page)`, `async` methods.
- **Page Object Manager:** `tests/pages/POManager.js` — facade with `get<Name>Page()` accessors.
- **Config:** `tests/config/index.js` loads `.env` + `tests/config/test-data/{env}.json`. Import via `const { credentials, urls, ui } = require('../config')` (from `tests/pages/`).
- **Custom fixtures:** `tests/fixtures/index.js` extends base test. Import `{ test, expect }` from `../fixtures`, NOT from `@playwright/test`.
- **Auth header format:** API uses `authorization: <raw-token>` (lowercase, no `Bearer ` prefix).
- **Never delete commented sections** in spec files. Comment blocks at the top document intentionally skipped tests — preserve them.
- **Fixture references**
  - `poManager` — auto-creates `POManager(page)`. Available to any UI test.
  - `loggedInPage` — returns a page already logged in on the dashboard.
  - `authToken` — returns a valid API token from login endpoint. Available to any API test.

## Framework Structure

```
tests/
├── spec-<Module>/                 # e.g. spec-login/, spec-dashboard/, spec-cart/
│   ├── <Feature>test.spec.js      # UI tests for this module
│   └── api/
│       └── <Feature>.api.spec.js  # API tests for this module
├── pages/                         # Page objects (shared across modules)
│   ├── <PageName>.js
│   └── POManager.js
├── fixtures/                      # Custom fixture definitions
│   └── index.js
└── config/                        # Environment config + test data
    ├── index.js
    └── test-data/
        ├── dev.json
        ├── staging.json
        └── prod.json
```

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
- File: `tests/spec-<Module>/<Feature>test.spec.js`
- Header imports only: fixtures + config.
  ```js
  const { test, expect } = require('../fixtures');
  const { credentials, urls } = require('../config');
  ```
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
- File: `tests/spec-<Module>/api/<Feature>.api.spec.js`
- Header imports:
  ```js
  const { test, expect } = require('../../fixtures');
  const { credentials, urls } = require('../../config');
  ```
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

## Multi-Agent Support

### Agent 1: Failure Analyst

**Script:** `ai-agents/agent-bug-report.js`

When a test fails on CI (main branch), reads `test-results/`, extracts the error, and files a structured JIRA bug ticket.

#### Setup

1. Copy `jira.config.example.json` to `jira.config.json` and fill in your JIRA credentials:
   ```bash
   cp jira.config.example.json jira.config.json
   # Edit jira.config.json with your real JIRA host, email, API token, project key
   ```
   Or set environment variables: `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`

2. For CI, add these to GitHub Secrets:
   - `JIRA_HOST`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `JIRA_PROJECT_KEY`

#### Usage

```bash
# Read from test-results/.last-run.json (after a test run)
npm run agent:bug-report

# Dry run — writes bug-report-output.json without calling JIRA
npm run agent:bug-report:dry-run

# Read from a specific JSON reporter file
node ai-agents/agent-bug-report.js --file=path/to/test-results.json
```

#### What it does

1. Reads `test-results/.last-run.json` or a provided JSON reporter file
2. Extracts all failed tests with error messages and stack traces
3. If JIRA is configured, creates a Bug issue per failure via REST API
4. If JIRA is not configured, writes `bug-report-output.json` with all failures
5. Tags: `playwright`, `test-failure`, `<project-name>`

### Agent 2: Ticket Scanner

**Script:** `ai-agents/agent-test-generator.js`

When a JIRA ticket moves to QA Review, provide the ticket JSON (see `ai-agents/jira-tickets-sample.json` for format). The agent will:
1. Analyze the affected page via `playwright-cli` (optional, requires browser session)
2. Generate test spec(s) under the appropriate `<Module>/` directory
3. Tag tests with `@jira-<ID>` for traceability
4. Execute and report pass/fail back to JIRA

#### Setup

No additional setup required. Uses existing config from `tests/config/test-data/{env}.json`.

#### Usage

```bash
# Generate test spec(s) from a ticket JSON file
npm run agent:test-generator -- path/to/ticket.json

# Generate and run the tests
node ai-agents/agent-test-generator.js path/to/ticket.json --run

# Skip playwright-cli page analysis (faster, no browser needed)
node ai-agents/agent-test-generator.js path/to/ticket.json --no-analyze

# Example with sample data
node ai-agents/agent-test-generator.js ai-agents/jira-tickets-sample.json
```

#### Ticket JSON format

See `ai-agents/jira-tickets-sample.json` for the full format:
- `id` — JIRA issue key (e.g. `JIRA-789`) — used for `@jira-<ID>` tagging
- `summary` — ticket title → used as test describe block
- `description` — ticket details → used as test TODO notes
- `component` — maps to module directory (`login`, `dashboard`, `cart`, etc.)
- `priority` — for reference only
- `labels` — `["api"]` creates API tests; `"auth"` adds auth token fixture

#### What it does

1. Reads the ticket JSON and project config
2. Maps `component` to the correct `tests/<Module>/` directory
3. Optionally opens the page with `playwright-cli` to discover elements and API endpoints
4. Generates a spec file with proper imports (fixtures + config), describe blocks, and `@jira-<ID>` tags
5. Creates both positive and edge-case test scaffolds based on the ticket description
6. If `--run` flag is set, executes the generated tests
7. Writes a summary to `agent-test-generator-output.json`

#### Component → Module mapping

| Component | Module Directory | Test Type |
|---|---|---|---|
| `login`, `register`, `password` | `tests/spec-login/` | UI (no auth) |
| `dashboard` | `tests/spec-dashboard/` | UI (auth) |
| `cart`, `orders`, `checkout` | `tests/spec-<module>/` | UI (auth) |
| Component with `"api"` label | `tests/spec-<module>/api/` | API |

