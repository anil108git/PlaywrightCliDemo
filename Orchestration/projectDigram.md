# PlaywrightCLIDemo — Orchestration Diagram

## 1. System Architecture Overview

![System Architecture Overview](01-system-architecture.png)

**Layers (top to bottom):**
- **CI/CD Layer** — GitHub Actions workflows for test execution + auto bug filing
- **Agent Layer** — AI agents for failure analysis (JIRA) and test generation
- **Test Layer** — UI and API spec files for Login and Dashboard modules
- **Fixture Layer** — Custom Playwright fixtures (poManager, authToken, loggedInPage)
- **Page Object Layer** — POManager facade + LoginPage / DashboardPage
- **Config Layer** — Environment loader, test data JSON files, .env

---

## 2. Data Flow Diagram

![Data Flow Diagram](02-data-flow.png)

**Flow:** `.env` + `{env}.json` → config loader → fixtures → page objects → spec files → test results → JIRA bugs

---

## 3. Test Execution Flow

![Test Execution Flow](03-test-execution.png)

**Sequence:** User triggers Playwright → reads config → matches spec files → fixtures instantiate POManager → page objects interact with target app → assertions → pass/fail with trace on retry

---

## 4. CI/CD Pipeline

![CI/CD Pipeline](04-cicd-pipeline.png)

**Pipeline:** Push/PR → sequential API + UI test jobs → on failure, upload artifacts → auto-bug-report workflow files JIRA tickets with trace.zip attachments

---

## 5. Component Interaction Matrix

![Component Interaction Matrix](05-component-interaction.png)

**Matrix:** Which spec files import which fixtures, page objects, and config sources. Login & Dashboard UI specs use `poManager` + `loggedInPage`; API specs use `authToken` + `request` fixture.

---

## 6. File Dependency Graph

![File Dependency Graph](06-file-dependency.png)

**Graph:** Complete `require()` dependency tree across all 20+ project modules — config, fixtures, page objects, specs, agents, and CI workflow files.
