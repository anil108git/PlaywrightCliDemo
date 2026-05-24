const fs = require('fs');
const path = require('path');
const https = require('https');

const RESULTS_DIR = path.resolve(__dirname, '..', 'test-results');
const LAST_RUN_FILE = path.join(RESULTS_DIR, '.last-run.json');
const JSON_REPORT_FILE = path.resolve(__dirname, '..', 'test-results.json');
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
  if (fs.existsSync(JSON_REPORT_FILE)) {
    const data = JSON.parse(fs.readFileSync(JSON_REPORT_FILE, 'utf-8'));
    return { source: 'json-reporter', data };
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
    if (typeof t === 'string') {
      return {
        testId: t,
        title: 'Unknown test',
        file: 'test-results/.last-run.json',
        projectName: 'unknown',
        retry: 0,
        errors: [{ message: 'Run tests with --reporter=json to get full failure details', stack: '' }],
      };
    }
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
  function walk(suite, ancestors) {
    if (suite.suites) suite.suites.forEach(s => walk(s, [...ancestors, suite.title]));
    if (suite.specs) {
      suite.specs.forEach(spec => {
        if (spec.ok === false) {
          const latestByTest = {};
          (spec.tests || []).forEach(t => {
            (t.results || []).forEach(r => {
              const key = t.testId || spec.title;
              if (!latestByTest[key] || r.retry > latestByTest[key].retry) {
                latestByTest[key] = { r, t, spec, suite, ancestors };
              }
            });
          });
          Object.values(latestByTest).forEach(({ r, t }) => {
            if (r.status === 'failed' || r.status === 'timedOut') {
              failures.push({
                testId: t.testId || spec.title,
                title: spec.title,
                file: spec.file || suite.file || 'unknown',
                projectName: t.projectName || 'unknown',
                retry: r.retry || 0,
                suiteTitles: ancestors.filter(Boolean),
                errors: r.error ? [{ message: r.error.message || '', stack: r.error.stack || '' }] : [],
              });
            }
          });
        }
      });
    }
  }
  if (json.suites) json.suites.forEach(s => walk(s, []));
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

function stripAnsi(str) {
  return str.replace(/\u001b\[\d+(;\d+)*m/g, '').replace(/\u001b\[\d+[A-Za-z]/g, '');
}

function shortenStack(stack) {
  if (!stack) return '';
  const lines = stack.split('\n').filter(l => l.includes('/tests/') || l.includes('\\tests\\'));
  return lines.slice(0, 5).join('\n');
}

function parseErrorDetails(message) {
  const clean = stripAnsi(message || '');
  const lines = clean.split('\n');
  let expected = '', received = '', locator = '', rest = [];
  let phase = 'header';
  for (const line of lines) {
    if (line.startsWith('Locator:')) { locator = line.replace('Locator:', '').trim(); phase = 'detail'; }
    else if (line.startsWith('Expected:')) { expected = line.replace('Expected:', '').trim(); phase = 'detail'; }
    else if (line.startsWith('Received:')) { received = line.replace('Received:', '').trim(); phase = 'detail'; }
    else if (phase === 'detail') rest.push(line);
    else if (phase === 'header' && !line.startsWith('Error:')) rest.push(line);
  }
  return { clean, expected, received, locator, log: rest.join('\n').trim() };
}

function deriveSteps(title) {
  const cleaned = title.replace(/@\w+\s*/g, '').trim();
  const match = cleaned.match(/TC\d+:\s*(.*)/);
  const action = match ? match[1] : cleaned;
  return [
    `Set environment to 'dev'`,
    `Run: npx playwright test --grep "${cleaned.replace(/"/g, '\\"')}"`,
    `Test ${action.toLowerCase()}`,
  ];
}

// ── ADF Helpers ────────────────────────────────────────────────────────────

function adfText(text) {
  return { type: 'text', text: String(text) };
}

function adfParagraph(items) {
  return { type: 'paragraph', content: Array.isArray(items) ? items : [adfText(items)] };
}

function adfHeading(level, text) {
  return { type: 'heading', attrs: { level }, content: [adfText(text)] };
}

function adfCodeBlock(text) {
  return { type: 'codeBlock', attrs: {}, content: [{ type: 'text', text: String(text) }] };
}

function adfTableRow(label, value) {
  return {
    type: 'tableRow',
    content: [
      { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: label, marks: [{ type: 'strong' }] }] }] },
      { type: 'tableCell', content: [{ type: 'paragraph', content: [adfText(value)] }] },
    ],
  };
}

function adfTableHeader(label) {
  return {
    type: 'tableRow',
    content: [
      { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: label, marks: [{ type: 'strong' }] }] }] },
      { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: label, marks: [{ type: 'strong' }] }] }] },
    ],
  };
}

function adfBulletItem(text) {
  return { type: 'listItem', content: [{ type: 'paragraph', content: [adfText(text)] }] };
}

function adfBulletList(items) {
  return { type: 'bulletList', content: items.map(adfBulletItem) };
}

function adfOrderedItem(text) {
  return { type: 'listItem', content: [{ type: 'paragraph', content: [adfText(text)] }] };
}

function adfOrderedList(items) {
  return { type: 'orderedList', content: items.map(adfOrderedItem) };
}

function adfPanel(type, text) {
  return {
    type: 'panel',
    attrs: { panelType: type },
    content: [{ type: 'paragraph', content: [adfText(text)] }],
  };
}

function buildDescription(failure) {
  const error = parseErrorDetails(failure.errors[0]?.message || '');
  const suiteChain = (failure.suiteTitles || []).join(' > ');
  const testName = failure.title.replace(/@\w+/g, '').trim();
  const steps = deriveSteps(failure.title);

  const content = [];

  // Summary
  content.push(adfHeading(2, 'Test Failure'));
  content.push(adfParagraph(`The test "${testName}" failed during execution.`));

  // Environment table
  content.push(adfHeading(3, 'Environment'));
  const tableRows = [
    adfTableRow('Test', testName),
    adfTableRow('File', failure.file),
    adfTableRow('Project', failure.projectName),
    adfTableRow('Environment', process.env.ENV || 'dev'),
    adfTableRow('Retry Attempt', String(failure.retry)),
  ];
  if (suiteChain) {
    tableRows.splice(1, 0, adfTableRow('Test Suite', suiteChain));
  }
  content.push({
    type: 'table',
    attrs: { isNumberColumnEnabled: false, layout: 'default' },
    content: tableRows,
  });

  // Steps to reproduce
  content.push(adfHeading(3, 'Steps to Reproduce'));
  content.push(adfOrderedList(steps));

  // Expected vs Actual
  if (error.expected || error.received) {
    content.push(adfHeading(3, 'Expected Result'));
    content.push(adfParagraph(error.expected || 'See error details below'));
    content.push(adfHeading(3, 'Actual Result'));
    content.push(adfParagraph(error.received || 'See error details below'));
  }

  // Locator info
  if (error.locator) {
    content.push(adfHeading(3, 'Element'));
    content.push(adfCodeBlock(error.locator));
  }

  // Error details
  content.push(adfHeading(3, 'Error Details'));
  content.push(adfCodeBlock(error.clean));

  // Call log
  if (error.log) {
    content.push(adfHeading(4, 'Call Log'));
    content.push(adfCodeBlock(error.log));
  }

  // Footer
  content.push(adfParagraph('---'));
  content.push(adfParagraph('Automatically filed by Failure Analyst agent'));

  return { type: 'doc', version: 1, content };
}

// ── Trace Attachment ────────────────────────────────────────────────────────

function findTraceFiles(failure) {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  const entries = fs.readdirSync(RESULTS_DIR);
  const fileSlug = failure.file.replace(/\.spec\.js$/i, '').replace(/[/\\]/g, '-').toLowerCase();
  let bestDir = null, bestRetry = -1;
  for (const entry of entries) {
    const entryPath = path.join(RESULTS_DIR, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;
    if (!entry.toLowerCase().includes(fileSlug)) continue;
    const retryMatch = entry.match(/-retry(\d+)$/);
    const retry = retryMatch ? parseInt(retryMatch[1], 10) : 0;
    if (retry >= bestRetry) {
      bestRetry = retry;
      bestDir = entryPath;
    }
  }
  if (!bestDir) return [];
  const files = [];
  for (const name of ['trace.zip', 'error-context.md']) {
    const fp = path.join(bestDir, name);
    if (fs.existsSync(fp)) files.push(fp);
  }
  return files;
}

function attachFilesToIssue(config, issueKey, filePaths) {
  return Promise.all(filePaths.map(fp => attachFileToIssue(config, issueKey, fp)));
}

function attachFileToIssue(config, issueKey, filePath) {
  return new Promise(resolve => {
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----Boundary' + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([Buffer.from(header), fileContent, Buffer.from(footer)]);

    const url = new URL(`${config.host}/rest/api/3/issue/${issueKey}/attachments`);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        Authorization: `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`,
        'X-Atlassian-Token': 'no-check',
      },
    }, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, fileName });
        } else {
          resolve({ success: false, fileName, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    req.on('error', err => resolve({ success: false, fileName, error: err.message }));
    req.write(body);
    req.end();
  });
}

// ── JIRA API ───────────────────────────────────────────────────────────────

function createJiraIssue(config, failure) {
  return new Promise((resolve, reject) => {
    const summary = `[Test Failure] ${sanitizeTitle(failure.title)}`;

    const body = JSON.stringify({
      fields: {
        project: { key: config.projectKey },
        summary,
        description: buildDescription(failure),
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
    console.log('No test results found. Run tests first, then re-run this script.');
    console.log('Usage:');
    console.log('  1. ENV=dev npx playwright test --reporter=json 2>/dev/null > test-results.json');
    console.log('  2. node ai-agents/agent-bug-report.js [--file=test-results.json] [--dry-run]');
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
      const traceFiles = findTraceFiles(failure);
      if (traceFiles.length > 0) {
        const attachResults = await attachFilesToIssue(jiraConfig, result.key, traceFiles);
        for (const ar of attachResults) {
          if (ar.success) {
            console.log(`    ✓ Attached: ${ar.fileName}`);
          } else {
            console.log(`    ✗ Failed to attach ${ar.fileName}: ${ar.error}`);
          }
        }
      }
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
