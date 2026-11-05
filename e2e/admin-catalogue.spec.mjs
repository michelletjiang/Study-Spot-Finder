// admin-catalogue.spec.mjs
// End-to-end test (Playwright) of an admin managing the study-spot catalogue in the browser:
//   add a spot -> students can see it -> edit its seats -> delete it -> it is gone for everyone.
// Uses the admin test account from the README (override with ADMIN_EMAIL / ADMIN_PASSWORD). The spot it adds has a
// unique name and is removed at the end, even if a step fails.
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, deleteApiUser, uiLogin, ADMIN, TEST_BUILDING } from './helpers.mjs'

test('an admin adds, edits and deletes a study spot', async ({ page, playwright, baseURL }) => {
  const name = `E2E Room ${Date.now().toString(36)}`
  const student = await apiUser(playwright, baseURL, newAccount('viewer'))
  let spotId = null // read from the new spot's row, so each check asks for that one spot, not all ~390
  const studentSees = async () => {
    const res = await student.get(`/api/spots/${spotId}`, { timeout: 15_000 })
    return res.ok() ? res.json() : undefined
  }
  const row = () => page.getByRole('row').filter({ hasText: name })
  // On a phone-sized screen the table's sticky header row overlaps the first row's buttons, so the row's Edit and
  // Delete are used with the keyboard (focus + Enter), as a keyboard or screen-reader user would.

  page.on('dialog', dialog => dialog.accept()) // the "Delete ...?" confirm
  await uiLogin(page, ADMIN.email, ADMIN.password)

  try {
    await test.step('add a study spot through the form', async () => {
      await page.goto('/admin/spots/new')
      await expect(page.getByRole('heading', { name: 'Add a study spot' })).toBeVisible()
      await page.getByLabel('Building').selectOption(TEST_BUILDING)
      await page.getByLabel('Room name').fill(name)
      await page.getByLabel('Floor').fill('2')
      await page.getByLabel('Seats').fill('4')
      await page.locator('label', { hasText: /^Yes$/ }).click()
      await page.locator('label', { hasText: /^Quiet$/ }).click()
      await page.getByRole('button', { name: 'Add study spot' }).click()
      await expect(page).toHaveURL(/\/admin\/spots$/)
    })

    await test.step('the new spot is listed for admins and visible to students', async () => {
      await page.getByRole('searchbox', { name: 'Search' }).fill(name)
      await expect(row()).toHaveCount(1)
      // the row's View link points at /spots/<id>
      const href = await row().getByRole('link', { name: `View ${name}` }).getAttribute('href')
      spotId = href.split('/').pop()
      const seen = await studentSees()
      expect(seen).toMatchObject({ buildingName: TEST_BUILDING, floor: '2', seatCount: 4, hasPowerSocket: true, noiseLevel: 'Quiet' })
    })

    await test.step('edit the seat count', async () => {
      const edit = row().getByRole('link', { name: `Edit ${name}` })
      await edit.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('heading', { name: `Edit ${name}` })).toBeVisible()
      await page.getByLabel('Seats').fill('8')
      await page.getByRole('button', { name: 'Save changes' }).click()
      await expect(page).toHaveURL(/\/admin\/spots$/)
      expect((await studentSees()).seatCount).toBe(8)
    })

    await test.step('a bad floor is rejected with a clear message', async () => {
      await page.goto('/admin/spots/new')
      await page.getByLabel('Building').selectOption(TEST_BUILDING)
      await page.getByLabel('Room name').fill(`${name} bad`)
      await page.getByLabel('Floor').fill('99')
      await page.getByLabel('Seats').fill('4')
      await page.locator('label', { hasText: /^Moderate$/ }).click()
      await page.getByRole('button', { name: 'Add study spot' }).click()
      await expect(page.getByRole('alert')).toContainText(/Floor/)
      await expect(page).toHaveURL(/\/admin\/spots\/new$/)
    })

    await test.step('delete it: it is gone for everyone', async () => {
      await page.goto('/admin/spots')
      await page.getByRole('searchbox', { name: 'Search' }).fill(name)
      const del = row().getByRole('button', { name: `Delete ${name}` })
      await del.focus()
      await page.keyboard.press('Enter')
      await expect(row()).toHaveCount(0)
      expect(await studentSees()).toBeUndefined()
    })
  } finally {
    // clean up whatever a failed step left behind (quick calls only, so cleanup cannot hang the run)
    if (spotId) await page.request.delete(`/api/spots/${spotId}`, { timeout: 10_000 }).catch(() => {})
    await deleteApiUser(student).catch(() => {})
  }
})
