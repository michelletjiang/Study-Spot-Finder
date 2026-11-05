// access-control.spec.mjs
// End-to-end test (Playwright) of who may see and do what:
//   logged out -> a protected page sends you to login and back again afterwards; the API refuses you (401)
//   student -> admin pages send you home; admin API calls are refused (403)
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, uiLogin, firstSpot } from './helpers.mjs'

test('logged-out visitors are sent to login, then back to the page they wanted', async ({ page, playwright, baseURL }) => {
  const account = newAccount('access')
  const created = await apiUser(playwright, baseURL, account)
  await created.dispose()

  try {
    await test.step('the API refuses a visitor who is not logged in', async () => {
      expect((await page.request.get('/api/reviews/mine')).status()).toBe(401)
      expect((await page.request.get('/api/favourites')).status()).toBe(401)
    })

    await test.step('a protected page redirects to login and remembers where you were going', async () => {
      await page.goto('/favourites')
      await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)favourites/)
      await expect(page.getByText('Log in to see that page.')).toBeVisible()
      await page.getByLabel('Email').fill(account.email)
      await page.getByLabel('Password').fill(account.password)
      await page.getByRole('button', { name: 'Log in' }).click()
      await expect(page).toHaveURL(/\/favourites$/)
      await expect(page.getByRole('heading', { name: 'My favourite spots' })).toBeVisible()
    })
  } finally {
    await page.request.delete('/api/profile')
  }
})

test('students cannot use admin pages or admin APIs', async ({ page, playwright, baseURL }) => {
  const account = newAccount('student')
  const created = await apiUser(playwright, baseURL, account)
  await created.dispose()
  await uiLogin(page, account.email, account.password)

  try {
    await test.step('typing an admin URL sends a student home', async () => {
      await page.goto('/admin/reports')
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0)
    })

    await test.step('the server refuses admin actions from a student', async () => {
      const spot = await firstSpot(page.request)
      expect((await page.request.post('/api/spots', { data: { ...spot, name: 'Not allowed' } })).status()).toBe(403)
      expect((await page.request.put(`/api/spots/${spot._id}`, { data: { seatCount: 999 } })).status()).toBe(403)
      expect((await page.request.delete(`/api/spots/${spot._id}`)).status()).toBe(403)
      expect((await page.request.get('/api/reports/pending')).status()).toBe(403)
    })
  } finally {
    await page.request.delete('/api/profile')
  }
})
