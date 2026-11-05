// checkin-noise.spec.mjs
// End-to-end test (Playwright) of the app's main live journey, through the real Vue UI:
//   open a building's floor plan -> switch on the noise heatmap -> pick a room -> (not checked in: rating refused)
//   -> check in (seats free drops) -> rate the room Loud from the heatmap panel -> the rating counts and the room's
//   label shows it -> check out (the seat is free again).
//
// It uses a known room with a floor plan (Li Ka Shing Library, level 3) and a throw-away account that is deleted
// at the end, which also deletes its check-in and noise rating.
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { newAccount, apiUser, uiLogin, findSpot, TEST_BUILDING, TEST_FLOOR, TEST_ROOMS } from './helpers.mjs'

const { checkInWindow } = createRequire(import.meta.url)('../lib/building-hours.js')
const ROOM = TEST_ROOMS[0]

// check-ins are refused while the building is closed, so this journey can only run during opening hours
test.skip(!checkInWindow(TEST_BUILDING).open, `${TEST_BUILDING} is closed now, so check-ins are refused`)

test('check in, rate the noise and see it on the heatmap', async ({ page, playwright, baseURL }) => {
  const account = newAccount('noise')
  const created = await apiUser(playwright, baseURL, account)
  await created.dispose() // only needed to create the account; the browser page logs in for real below
  await uiLogin(page, account.email, account.password)

  try {
    const spot = await findSpot(page.request, TEST_BUILDING, ROOM)
    const floorUrl = `/building/${encodeURIComponent(TEST_BUILDING)}?floor=${TEST_FLOOR}`
    const seatsTaken = async () => ((await (await page.request.get(`/api/checkins?spots=${spot._id}`)).json())[spot._id] || 0)
    const noiseSummary = async () => (await (await page.request.get(`/api/noise/${spot._id}`)).json())
    const room = page.getByRole('button', { name: new RegExp(`^${ROOM},`) })

    await test.step('switch the floor plan to the noise heatmap', async () => {
      await page.goto(floorUrl)
      await expect(page.getByRole('heading', { name: TEST_BUILDING, level: 1 })).toBeVisible()
      await page.locator('label', { hasText: 'Noise now' }).click()
      await expect(page.getByText('how loud it is right now')).toBeVisible()
      await expect(page.getByLabel('Room colours: how loud, from Quiet to Loud')).toBeVisible()
      // every room on the plan says whether it has recent noise reports
      await expect(room).toHaveAttribute('aria-label', /Noise: |No recent noise reports/)
    })

    await test.step('a student who is not checked in cannot rate the room', async () => {
      await room.click()
      await expect(page.getByRole('button', { name: 'Check in to rate' })).toBeVisible()
      await expect(page.getByRole('group', { name: 'How loud is it?' })).toHaveCount(0)
      // the server refuses too, so hiding the buttons is not the only protection
      const res = await page.request.post(`/api/noise/${spot._id}`, { data: { status: 'Loud' } })
      expect(res.status()).toBe(403)
    })

    let takenBefore
    await test.step('check in: one more seat is taken', async () => {
      takenBefore = await seatsTaken()
      const res = await page.request.post(`/api/checkins/${spot._id}`)
      expect(res.status()).toBe(201)
      expect(await seatsTaken()).toBe(takenBefore + 1)
    })

    await test.step('rate the room Loud from the heatmap panel', async () => {
      const before = (await noiseSummary()).summary.count
      await page.goto(floorUrl)
      await page.locator('label', { hasText: 'Noise now' }).click()
      await room.click()
      const rating = page.getByRole('group', { name: 'How loud is it?' })
      await expect(rating).toBeVisible()
      await rating.getByRole('button', { name: 'Loud' }).click()
      await expect(page.getByText('Thanks! Your rating counts for an hour.')).toBeVisible()

      // the rating is saved and counted, and it is this student's
      const after = await noiseSummary()
      expect(after.summary.count).toBe(before + 1)
      expect(after.mine).toBe('Loud')
      // the heatmap refreshes: the room now reports its noise level and how many ratings it has
      await expect(room).toHaveAttribute('aria-label', /Noise: (Quiet|Some chatter|Loud) \(\d+ reports?\)/)
      await expect(rating.getByRole('button', { name: 'Loud' })).toHaveAttribute('aria-pressed', 'true')
    })

    await test.step('check out: the seat is free again', async () => {
      const res = await page.request.delete('/api/checkins/me')
      expect(res.ok()).toBeTruthy()
      expect(await seatsTaken()).toBe(takenBefore)
    })
  } finally {
    // deleting the account also deletes its check-in and noise rating
    await page.request.delete('/api/profile')
  }
})
