# PlaywrightCLIDemo

Playwright test suite for [Rahul Shetty Academy's E-Commerce App](https://rahulshettyacademy.com/client) — POM with multi-env support and AI agent scripts for JIRA integration.

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env    # set ENV=dev
```

## Running Tests

```bash
Commands to run the test suite
# Everything (UI + API)
npm test
# UI only
npm run test:ui
# API only
npm run test:api
# Specific env
npm run test:dev          # dev (default)
npm run test:staging
npm run test:prod
# By tag
npm run test:smoke        # @smoke tagged tests
npm run test:regression   # @regression tagged tests
# Single test by grep
npx playwright test --grep "TC_DB9"
# Single file
npx playwright test spec-login/logintest.spec.js
# Tests + JIRA bug report
npm run test:report
```

## Project Structure

```
tests/
├── spec-<Module>/              # e.g. spec-login/, spec-dashboard/
│   ├── <Feature>test.spec.js   # UI tests
│   └── api/                    # API tests
├── pages/                      # Page objects + POManager
├── fixtures/                   # Custom fixtures: poManager, authToken, loggedInPage
├── config/                     # Config loader + test-data (default.json + env overrides)
ai-agents/                      # agent-bug-report.js, agent-test-generator.js
```

## Key Conventions

- **Module system:** CommonJS (`require`/`module.exports`)
- **Imports:** `{ test, expect }` from `../fixtures`, NOT `@playwright/test`
- **Config:** `{ urls, credentials }` from `../config` — never hardcode URLs
- **Auth header:** lowercase `authorization: <raw-token>` (no `Bearer`)
- **Fixtures:** `poManager`, `loggedInPage` (pre-logged-in), `authToken` (API token)
- **Tags:** `@smoke @regression @ui @api` on every test for `--grep` filtering

## CI/CD

GitHub Actions pipeline: API tests first (fast gate), then UI Chromium. Test fail → `ai-agents/agent-bug-report.js` auto-files JIRA ticket.

## Agents

See `AGENTS.md` for Failure Analyst (auto-bug-report) and Ticket Scanner (test generator from JIRA tickets) setup and usage.
