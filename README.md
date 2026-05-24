# PlaywrightCLIDemo

Playwright test suite for [Rahul Shetty Academy's E-Commerce App](https://rahulshettyacademy.com/client) — POM, multi-env, and JIRA bug reporting.

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env                  # set ENV=dev (default)
cp jira.config.example.json jira.config.json   # JIRA credentials (optional)
```

## Commands

| Command | Description |
|---|---|
| `npm test` | Run all tests |
| `npm run test:ui` | UI tests only |
| `npm run test:api` | API tests only |
| `npm run test:dev` | Dev env (default) |
| `npm run test:staging` | Staging env |
| `npm run test:prod` | Production env |
| `npm run test:smoke` | `@smoke` tagged tests |
| `npm run test:regression` | `@regression` tagged tests |
| `npm run test:report` | Tests + auto-file JIRA bugs |
| `npm run agent:bug-report` | File JIRA bugs from last run |
| `npm run agent:bug-report:dry-run` | Dry run (no JIRA calls) |
| `npm run agent:test-generator -- <file>` | Generate tests from JIRA ticket |
| `npx playwright test --grep "TC_DB9"` | Single test by grep |
| `npx playwright test spec-login/logintest.spec.js` | Single file |
| `npx playwright show-trace test-results/.../trace.zip` | Inspect trace |

## Structure

```
tests/
├── spec-<Module>/           # e.g. spec-login/, spec-dashboard/
│   ├── <Feature>test.spec.js
│   └── api/                 # API test specs
├── pages/                   # Page objects + POManager
├── fixtures/                # Custom fixtures: poManager, authToken, loggedInPage
└── config/                  # Config loader + test-data JSON
ai-agents/                   # agent-bug-report.js, agent-test-generator.js
```

## Conventions

- **CommonJS** (`require`/`module.exports`)
- **Fixture imports:** `{ test, expect }` from `../fixtures` (not `@playwright/test`)
- **Config:** `{ urls, credentials }` from `../config` — never hardcode URLs/endpoints
- **Auth header:** lowercase `authorization: <raw-token>` (no `Bearer`)
- **Fixtures:** `poManager` (POM facade), `loggedInPage` (pre-logged-in), `authToken` (cached API token)
- **Tags:** `@smoke @regression @ui @api` on every test

## Agents

- **Failure Analyst** (`agent-bug-report.js`): reads `test-results.json` → files JIRA bug per failure. Configure via `jira.config.json` or env vars (`JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`).
- **Ticket Scanner** (`agent-test-generator.js`): reads JIRA ticket JSON → generates test specs. See `AGENTS.md` for details.
