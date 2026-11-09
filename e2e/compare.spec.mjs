// compare.spec.mjs
// End-to-end test (Playwright) of comparing study spots:
//   pick two spots on a floor plan -> the compare tray counts them -> Compare opens /compare with both cards in order
//   -> a third spot shows three cards -> removing one keeps the other two. The server only accepts 2 or 3 unique spots.
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, uiLogin, findSpot, TEST_BUILDING, TEST_ROOMS } from './helpers.mjs'

test('compare two, then three study spots', async ({ page, playwright, baseURL }) => {
  const account = newAccount('compare')
  const created = await apiUser(playwright, baseURL, account)
  await created.dispose()
  await uiLogin(page, account.email, account.password)

  try {
    const [a, b, c] = await Promise.all(TEST_ROOMS.map(name => findSpot(page.request, TEST_BUILDING, name)))

    await test.step('the server only compares two or three different spots', async () => {
      const compare = ids => page.request.get(`/api/spots/compare?ids=${ids.join(',')}`)
      expect((await compare([a._id])).status()).toBe(400)
      expect((await compare([a._id, a._id])).status()).toBe(400)
      expect((await compare([a._id, b._id, c._id, a._id])).status()).toBe(400)
      const ok = await (await compare([b._id, a._id])).json()
      expect(ok.spots.map(s => s._id)).toEqual([b._id, a._id]) // kept in the order the student chose
    })

    await test.step('pick two spots from the floor plan', async () => {
      // the shortlist lives in the page's memory, so both picks happen without reloading the page
      await page.goto(`/building/${encodeURIComponent(TEST_BUILDING)}?floor=3&spot=${a._id}`)
      const panel = name => page.getByRole('complementary', { name: `${name} details` })
      await expect(panel(a.name)).toBeVisible()
      await expect(panel(a.name).getByRole('link', { name: /Busiest times/ })).toHaveCount(0)
      await panel(a.name).getByRole('button', { name: 'Compare', exact: true }).click()
      await expect(panel(a.name).getByRole('button', { name: 'Comparing', exact: true })).toBeVisible()

      await page.getByRole('button', { name: new RegExp(`^${b.name},`) }).click()
      await expect(panel(b.name)).toBeVisible()
      await panel(b.name).getByRole('button', { name: 'Compare', exact: true }).click()

      const tray = page.getByRole('complementary', { name: 'Selected spots for comparison' })
      await expect(tray.getByRole('heading', { name: /^2 of 3 picked/ })).toBeVisible()
      await tray.getByRole('button', { name: /^Compare 2 spots/ }).click()
    })

    await test.step('the comparison shows both spots side by side, in order', async () => {
      await expect(page).toHaveURL(new RegExp(`/compare\\?ids=${a._id}(%2C|,)${b._id}`))
      await expect(page.getByRole('heading', { name: 'Compare study spots' })).toBeVisible()
      const cards = page.getByRole('heading', { level: 2 }).filter({ hasText: /^RM3-/ })
      await expect(cards).toHaveText([a.name, b.name])
    })

    await test.step('three spots, then remove one', async () => {
      await page.goto(`/compare?ids=${a._id},${b._id},${c._id}`)
      const cards = page.getByRole('heading', { level: 2 }).filter({ hasText: /^RM3-/ })
      await expect(cards).toHaveText([a.name, b.name, c.name])
      await page.getByRole('button', { name: `Remove ${c.name} from the comparison` }).click()
      await expect(cards).toHaveText([a.name, b.name])
      await expect(page).not.toHaveURL(new RegExp(c._id))
    })

    await test.step('room details still show reviews without busy hours', async () => {
      await page.goto(`/spots/${a._id}`)
      await expect(page.getByRole('heading', { name: a.name, exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Reviews', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Busiest times', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /^(Compare|Comparing)$/ })).toBeVisible()
    })
  } finally {
    await page.request.delete('/api/profile')
  }
})
