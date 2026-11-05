import { test, expect } from '@playwright/test'

// This is read-only: it uses the first catalogue building and spot already provided by the app.
test('study feature checklist highlights matching spots', async ({ page }, testInfo) => {
  // Keep this browser check synthetic and read-only. No MongoDB account or catalogue data is touched.
  await page.route('**/api/me', route => route.fulfill({ json: { user: { username: 'synthetic', role: 'Student' } } }))
  await page.route('**/api/buildings/*/spots', route => route.fulfill({ json: {
    building: { buildingname: 'Synthetic Library' },
    studySpots: [
      { _id: 'spot-power-quiet', name: 'Quiet desk', floor: '2', seatCount: 4, hasPowerSocket: true, noiseLevel: 'Quiet' },
      { _id: 'spot-no-power', name: 'Window table', floor: '1', seatCount: 6, hasPowerSocket: false, noiseLevel: 'Quiet' },
    ],
  } }))
  await page.route('**/api/favourites', route => route.fulfill({ json: [] }))
  await page.goto('/building/Synthetic%20Library/spots')

  const checklist = page.getByRole('region', { name: 'What would you like in your study spot?' })
  await expect(checklist).toBeVisible()
  await checklist.getByLabel('Power socket').check()
  await expect(checklist.getByRole('status')).toContainText(/of/)
  await expect(page.locator('.feature-match').first()).toBeVisible()

  await page.screenshot({ path: `test-results/study-feature-checklist-${testInfo.project.name}.png`, fullPage: true })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'night'))
  await expect(page.locator('.study-spot-row--match')).toHaveCSS('color', 'rgb(244, 240, 223)')
  await page.screenshot({ path: `test-results/study-feature-checklist-night-${testInfo.project.name}.png`, fullPage: true })
})
