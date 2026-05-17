const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ENV = process.env.ENV || 'dev';

function loadJSON(filename) {
  const filePath = path.resolve(__dirname, 'test-data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    throw new Error(`Cannot load test data file: ${filePath}. ${e.message}`);
  }
}

const testData = loadJSON(`${ENV}.json`);

module.exports = {
  ENV,
  urls: testData.urls,
  credentials: testData.credentials,
  ui: testData.ui,
};
