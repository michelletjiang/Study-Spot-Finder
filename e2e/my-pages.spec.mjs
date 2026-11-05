// my-pages.spec.mjs
// End-to-end test (Playwright) of a student's own pages:
//   favourite a spot -> it is on My favourite spots -> remove it -> it is gone;
//   write a review -> it is on My reviews -> delete it from there -> it is gone from the spot page too.
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, uiLogin, findSpot, TEST_BUILDING, TEST_ROOMS } from './helpers.mjs'

test('favourites and my reviews: add, see, remove', async ({ page, playwright, baseURL }) => {
  const account = newAccount('mine')
  const created = await apiUser(playwright, baseURL, account)
  await created.dispose()
  page.on('dialog', dialog => dialog.accept()) // the "Delete your review ...?" confirm
  await uiLogin(page, account.email, account.password)

  try {
    const spot = await findSpot(page.request, TEST_BUILDING, TEST_ROOMS[1])
    const title = `My-pages test ${account.username}`

    await test.step('favourite a spot, then remove it from My favourite spots', async () => {
      await page.goto(`/spots/${spot._id}`)
      await page.waitForLoadState('networkidle') // the page loads the student's favourites first
      await page.getByRole('button', { name: 'Save to favourites', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Saved to favourites', exact: true })).toBeVisible()

      await page.goto('/favourites')
      await expect(page.getByRole('heading', { name: spot.name, exact: true })).toBeVisible()
      await page.getByRole('button', { name: `Remove ${spot.name} from favourites` }).click()
      await expect(page.getByRole('heading', { name: spot.name, exact: true })).toHaveCount(0)
      const favs = await (await page.request.get('/api/favourites')).json()
      expect(JSON.stringify(favs)).not.toContain(spot.name)
    })

    await test.step('a new review appears on My reviews', async () => {
      const res = await page.request.post('/api/reviews', {
        data: { spotId: spot._id, title, content: 'Temporary review for the my-pages test.', rating: 4, noiseLevel: 'Quiet' }
      })
      expect(res.status()).toBe(201)
      await page.goto('/my-reviews')
      await expect(page.getByRole('heading', { name: 'My reviews' })).toBeVisible()
      await expect(page.getByText(title)).toBeVisible()
    })

    await test.step('deleting it from My reviews removes it everywhere', async () => {
      await page.locator('article').filter({ hasText: title }).getByRole('button', { name: 'Delete' }).click()
      await expect(page.getByText(title)).toHaveCount(0)
      await page.goto(`/spots/${spot._id}`)
      await expect(page.getByRole('heading', { name: spot.name })).toBeVisible()
      await expect(page.getByText(title)).toHaveCount(0)
    })
  } finally {
    await page.request.delete('/api/profile')
  }
})
