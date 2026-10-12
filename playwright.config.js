const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './e2e', timeout: 15000, use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:8000', trace: 'on-first-retry', screenshot: 'only-on-failure' }, reporter: [['list']] });
