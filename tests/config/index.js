const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const VALID_ENVS = ['dev', 'staging', 'prod'];
const ENV = process.env.ENV || 'dev';
if (!VALID_ENVS.includes(ENV)) {
  throw new Error(`Unknown environment "${ENV}". Valid options: ${VALID_ENVS.join(', ')}`);
}

function loadJSON(filename) {
  const filePath = path.resolve(__dirname, 'test-data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    throw new Error(`Cannot load test data file: ${filePath}. ${e.message}`);
  }
}

const defaults = loadJSON('default.json');
const overrides = loadJSON(`${ENV}.json`);
const testData = { ...defaults, ...overrides };

module.exports = {
  urls: testData.urls,
  credentials: testData.credentials,
  ui: testData.ui,
};
