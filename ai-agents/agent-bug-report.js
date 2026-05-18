const fs = require('fs');
const path = require('path');
const https = require('https');

const RESULTS_DIR = path.resolve(__dirname, '..', 'test-results');
const LAST_RUN_FILE = path.join(RESULTS_DIR, '.last-run.json');
const JIRA_CONFIG_FILE = path.resolve(__dirname, '..', 'jira.config.json');
const DEFAULT_REPORT_FILE = path.resolve(__dirname, '..', 'bug-report-output.json');

// ── Helpers ────────────────────────────────────────────────────────────────

function loadJiraConfig() {
  if (fs.existsSync(JIRA_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(JIRA_CONFIG_FILE, 'utf-8'));
  }
  const envConfig = {
    host: process.env.JIRA_HOST,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
  };
  if (envConfig.host && envConfig.email && envConfig.apiToken && envConfig.projectKey) {
    return envConfig;
  }
  return null;
}

function loadResults(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    return { source: 'json-reporter', data: JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
  }
  if (fs.existsSync(LAST_RUN_FILE)) {
    const data = JSON.parse(fs.readFileSync(LAST_RUN_FILE, 'utf-8'));
    return { source: 'last-run', data };
  }
  return null;
}

function extractFailuresFromLastRun(lastRun) {
  if (lastRun.status === 'passed' || !lastRun.failedTests || lastRun.failedTests.length === 0) {
    return [];
  }
  return lastRun.failedTests.map(t => {
    const filePath = Array.isArray(t.path) ? t.path.join(path.sep) : (t.path || 'unknown');
    const errors = (t.errors || []).map(e => ({
      message: e.message || '',
      stack: e.stack || '',
    }));
    return {
      testId: t.testId || '',
      title: t.title || 'Unknown test',
      file: filePath,
      projectName: t.projectName || 'unknown',
      retry: t.retry || 0,
      errors,
    };
  });
}

function extractFailuresFromJsonReporter(json) {
  const failures = [];
  function walk(suite) {
    if (suite.suites) suite.suites.forEach(walk);
    if (suite.specs) {
      suite.specs.forEach(spec => {
        if (spec.ok === false) {
          (spec.tests || []).forEach(t => {
            (t.results || []).forEach(r => {
              if (r.status === 'failed' || r.status === 'timedOut') {
                failures.push({
                  testId: t.testId || spec.title,
                  title: spec.title,
                  file: spec.file || suite.file || 'unknown',
                  projectName: t.projectName || 'unknown',
                  retry: r.retry || 0,
                  errors: r.error ? [{ message: r.error.message || '', stack: r.error.stack || '' }] : [],
                });
              }
            });
          });
        }
      });
    }
  }
  if (json.suites) json.suites.forEach(walk);
  return failures;
}

function extractFailures(results) {
  if (!results) return [];
  if (results.source === 'last-run') return extractFailuresFromLastRun(results.data);
  if (results.source === 'json-reporter') return extractFailuresFromJsonReporter(results.data);
  return [];
}

function sanitizeTitle(title) {
  return title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
}

function shortenStack(stack) {
  if (!stack) return '';
  const lines = stack.split('\n').filter(l => l.includes('/tests/') || l.includes('\\tests\\'));
  return lines.slice(0, 5).join('\n');
}

// ── JIRA API ───────────────────────────────────────────────────────────────

function createJiraIssue(config, failure) {
  return new Promise((resolve, reject) => {
    const summary = `[Test Failure] ${sanitizeTitle(failure.title)}`;
    const description = `
h2. Test Failure Details

|| Field || Value ||
| Test | ${failure.title} |
| File | ${failure.file} |
| Project | ${failure.projectName} |
| Retry | ${failure.retry} |

h3. Error Message

{code}
${failure.errors[0]?.message || 'No error message'}
{code}

h3. Stack Trace

{code}
${shortenStack(failure.errors[0]?.stack) || failure.title}
{code}

h3. Labels

- playwright
- test-failure
- ${failure.projectName}

---

*Automatically filed by Failure Analyst agent*
`;

    const body = JSON.stringify({
      fields: {
        project: { key: config.projectKey },
        summary,
        description,
        issuetype: { name: 'Bug' },
        labels: ['playwright', 'test-failure', failure.projectName.replace(/[^a-zA-Z0-9]/g, '-')],
      },
    });

    const url = new URL(`${config.host}/rest/api/3/issue`);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, key: JSON.parse(data).key, summary });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}`, summary });
          }
        });
      }
    );
    req.on('error', err => resolve({ success: false, error: err.message, summary }));
    req.write(body);
    req.end();
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let resultsFile = null;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--file=')) resultsFile = arg.split('=')[1];
    else if (arg === '--dry-run') dryRun = true;
    else if (!arg.startsWith('--') && !resultsFile) resultsFile = arg;
  }

  const results = loadResults(resultsFile);
  if (!results) {
    console.log('No test results found. Check test-results/.last-run.json or provide a file.');
    console.log('Usage: node ai-agents/agent-bug-report.js [--file=<path>] [--dry-run]');
    process.exit(0);
  }

  const failures = extractFailures(results);
  if (failures.length === 0) {
    console.log('All tests passed. No bug report needed.');
    process.exit(0);
  }

  console.log(`Found ${failures.length} test failure(s):`);
  failures.forEach(f => console.log(`  - ${f.title} (${f.file})`));

  const jiraConfig = dryRun ? null : loadJiraConfig();

  if (!jiraConfig) {
    const report = failures.map(f => ({
      testTitle: f.title,
      file: f.file,
      projectName: f.projectName,
      retry: f.retry,
      errorMessage: f.errors[0]?.message || '',
      errorStack: f.errors[0]?.stack || '',
      timestamp: new Date().toISOString(),
    }));
    fs.writeFileSync(DEFAULT_REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\nJIRA not configured. Bug report saved to ${DEFAULT_REPORT_FILE}`);
    console.log('To enable JIRA integration, create jira.config.json (see jira.config.example.json)');
    process.exit(0);
  }

  console.log(`\nFiling ${failures.length} JIRA ticket(s) on ${jiraConfig.host}...`);
  const results_ = [];
  for (const failure of failures) {
    const result = await createJiraIssue(jiraConfig, failure);
    results_.push(result);
    if (result.success) {
      console.log(`  ✓ ${result.key}: ${result.summary}`);
    } else {
      console.log(`  ✗ Failed: ${result.summary} — ${result.error}`);
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    total: failures.length,
    created: results_.filter(r => r.success).length,
    failed: results_.filter(r => !r.success).length,
    tickets: results_,
  };
  fs.writeFileSync(DEFAULT_REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${DEFAULT_REPORT_FILE}`);

  if (report.failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
