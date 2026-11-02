// Playwright settings for the end-to-end tests in e2e/.
// The tests drive a real browser against the running app, so start it first with `npm run dev`
// (Express on :8000, Vue on :5173), then run `npm run test:e2e` in a second terminal.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // The journey shares one account across steps, so run tests one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  // Retry once to absorb a slow first load from MongoDB Atlas.
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The rubric grades responsive design, so the same journey also runs on a phone-sized screen.
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  // Reuse the app if it is already running; otherwise start it.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000
  }
})
