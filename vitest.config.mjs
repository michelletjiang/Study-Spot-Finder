// Vitest settings for the backend unit tests.
// Only test/unit is included, so Vitest does not try to run the node:test files in test/
// or the Playwright specs in e2e/.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/**/*.spec.js'],
    environment: 'node'
  }
})
