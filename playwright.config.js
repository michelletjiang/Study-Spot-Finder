const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 20000,
  fullyParallel: false,
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:8000', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: { command: 'DEMO_MODE=true PORT=8000 node scripts/demo.js', url: 'http://127.0.0.1:8000/health/live', reuseExistingServer: false, timeout: 120000 },
  reporter: [['list']]
});
