# PlaywrightCLIDemo

Playwright test automation suite for [Rahul Shetty Academy's E-Commerce App](https://rahulshettyacademy.com/client) using Page Object Model (POM) with multi-environment support.

## Tech Stack

- **Test runner:** Playwright 1.60
- **Language:** JavaScript (CommonJS)
- **Pattern:** Page Object Model with POManager facade
- **Config:** dotenv + environment-specific JSON test data
- **CI:** GitHub Actions

## Project Structure

```
├── tests/
│   ├── logintest.spec.js          # UI login tests
│   ├── api/
│   │   └── login.api.spec.js      # API login tests
│   ├── pages/
│   │   ├── LoginPage.js           # Login page object
│   │   ├── DashboardPage.js       # Dashboard page object
│   │   └── POManager.js           # Page object manager
│   └── config/
│       ├── index.js               # Config loader
│       └── test-data/
│           ├── dev.json           # Dev environment data
│           ├── staging.json       # Staging environment data
│           └── prod.json          # Prod environment data
├── playwright.config.js           # Playwright configuration
├── .env                           # Environment selection (gitignored)
├── .env.example                   # Environment template
└── AGENTS.md                      # opencode instructions
```

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env
```

Edit `.env` to set the target environment:

```
ENV=dev
```

## Configuration

### Environments

| Variable | Values | Default |
|---|---|---|
| `ENV` | `dev`, `staging`, `prod` | `dev` |

Set via `.env` file or inline: `ENV=staging npx playwright test`

### Test Data

Each environment has its own JSON file at `tests/config/test-data/{env}.json` containing:

- `urls` — base URLs, login, dashboard, API endpoints
- `credentials` — valid/invalid emails, passwords, edge-case inputs
- `ui` — expected labels, placeholders, titles

## Running Tests

```bash
# Run all tests (default: dev environment)
npm test

# Environment-specific
npm run test:dev
npm run test:staging
npm run test:prod

# Run by type
npm run test:api        # API tests only (fast, no browser)
npm run test:ui         # UI tests only (Chromium)

# Run by tag
npm run test:smoke      # @smoke tagged tests
npm run test:regression # @regression tagged tests
```

## Test Cases

### UI Tests (`tests/logintest.spec.js`) — 16 scenarios

| TC | Scenario | Tags |
|---|---|---|
| TC2 | Valid login with correct credentials | `@smoke @regression @ui` |
| TC3 | Invalid email format | `@regression @ui` |
| TC4 | Incorrect password | `@regression @ui` |
| TC5 | Empty email field | `@regression @ui` |
| TC6 | Empty password field | `@regression @ui` |
| TC7 | Both fields empty | `@regression @ui` |
| TC8 | SQL injection in email | `@regression @ui` |
| TC9 | XSS in email field | `@regression @ui` |
| TC10 | Leading/trailing spaces in email | `@regression @ui` |
| TC11 | Very long email input | `@regression @ui` |
| TC12 | Unicode characters in email | `@regression @ui` |
| TC13 | Email with +tag | `@regression @ui` |
| TC14 | UI elements presence | `@regression @ui` |
| TC15 | Forgot password navigation | `@regression @ui` |
| TC16 | Register link navigation | `@regression @ui` |

### API Tests (`tests/api/login.api.spec.js`) — 7 scenarios

| TC | Scenario | Tags |
|---|---|---|
| TC17 | Valid credentials return token | `@smoke @api` |
| TC18 | Invalid credentials return 400 | `@regression @api` |
| TC19 | Empty credentials return 400 | `@regression @api` |
| TC20 | Missing password returns 400 | `@regression @api` |
| TC21 | Missing email returns 400 | `@regression @api` |
| TC22 | SQL injection in email returns 400 | `@regression @api` |
| TC23 | Content-Type header is JSON | `@regression @api` |

## CI/CD

The `.github/workflows/playwright.yml` pipeline:

1. **API tests** run first (fast gate, no browser needed)
2. **UI tests** run on Chromium only (depends on API tests passing)

## Conventions

- **Module system:** CommonJS (`require`/`module.exports`)
- **Test files:** `tests/*.spec.js` — UI, `tests/api/*.spec.js` — API
- **Page objects:** `tests/pages/<Name>Page.js` with locators in constructor
- **Tags:** `@smoke @regression @ui @api` in test names for `--grep` filtering
- **Test data:** All variable data in `tests/config/test-data/{env}.json`
