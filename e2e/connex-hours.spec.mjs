import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { newAccount, apiUser, deleteApiUser, uiLogin } from './helpers.mjs'

const { checkInWindow } = createRequire(import.meta.url)('../lib/building-hours.js')

test('CONNEX shows its closed state and refuses check-ins outside opening hours', async ({ page, playwright, baseURL }) => {
  test.skip(checkInWindow('CONNEX').open, 'The closed-state journey runs outside CONNEX opening hours')
  const account = newAccount('connex')
  const user = await apiUser(playwright, baseURL, account)
  try {
    await uiLogin(page, account.email, account.password)
    const spots = await (await user.get('/api/spots')).json()
    const spot = spots.find(s => s.buildingName === 'CONNEX' && String(s.floor) === '4')
    expect(spot, 'CONNEX level 4 needs a study spot').toBeTruthy()

    await page.goto(`/building/CONNEX?floor=4&spot=${spot._id}`)
    await expect(page.getByRole('heading', { name: 'CONNEX', exact: true })).toBeVisible()
    const panel = page.getByRole('complementary', { name: `${spot.name} details` })
    await expect(panel.getByRole('button', { name: 'Building closed', exact: true })).toBeDisabled()
    await expect(panel.getByText(/You can check in once it opens/)).toBeVisible()

    const response = await user.post(`/api/checkins/${spot._id}`)
    expect(response.status()).toBe(409)
    expect((await response.json()).message).toContain('CONNEX is closed right now.')
  } finally {
    await deleteApiUser(user)
  }
})
