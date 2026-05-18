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
npm test                            # all tests (dev)
npm run test:staging                # staging env
npm run test:api                    # API only (fast, no browser)
npm run test:ui                     # UI only (Chromium)
npm run test:smoke                  # @smoke tagged
npm run test:regression             # @regression tagged
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
