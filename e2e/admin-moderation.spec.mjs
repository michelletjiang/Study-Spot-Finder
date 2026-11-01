// admin-moderation.spec.mjs
// End-to-end test (Playwright) of the admin moderation queue:
// a student reports another student's review, an admin approves the report in the browser,
// and the review is removed. A second report is declined and its review is kept.
//
// Needs an existing admin account in the database. Pass its login as environment variables:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run test:e2e
// Without them this spec is skipped (the other specs still run).

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, deleteApiUser, uiLogin, firstSpot } from './helpers.mjs'

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

test.describe('admin moderation', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set ADMIN_EMAIL and ADMIN_PASSWORD to run the admin tests')

  test('approving a report deletes the review; declining keeps it', async ({ page, playwright, baseURL }) => {
    const author = await apiUser(playwright, baseURL, newAccount('author'))
    const reporterAcc = newAccount('reporter')
    const reporter = await apiUser(playwright, baseURL, reporterAcc)

    try {
      // Arrange: two reviews by the author, each reported by the reporter.
      const spot = await firstSpot(author)
      const makeReview = async (title) => (await (await author.post('/api/reviews', {
        data: { spotId: spot._id, title, content: `${title} content`, rating: 2, noiseLevel: 'Loud' }
      })).json())
      const toApprove = await makeReview(`Approve me ${reporterAcc.username}`)
      const toDecline = await makeReview(`Decline me ${reporterAcc.username}`)
      for (const review of [toApprove, toDecline]) {
        const res = await reporter.post('/api/reports', { data: { reviewId: review._id, reason: 'Spam', description: 'E2E moderation test' } })
        expect(res.status()).toBe(201)
      }

      // Act: the admin works through the queue in the browser.
      page.on('dialog', dialog => dialog.accept()) // the "Approve this report?" confirm
      await uiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD)
      await page.goto('/admin/reports')
      await expect(page.getByRole('heading', { name: 'Pending Reports' })).toBeVisible()

      const rowFor = (review) => page.getByRole('row').filter({ hasText: review.content })

      await test.step('approve: the review is deleted', async () => {
        await rowFor(toApprove).getByRole('button', { name: 'Approve (delete review)' }).click()
        await expect(rowFor(toApprove)).toHaveCount(0)
        expect((await author.get(`/api/reviews/${toApprove._id}`)).status()).toBe(404)
      })

      await test.step('decline: the review stays', async () => {
        await rowFor(toDecline).getByRole('button', { name: 'Decline' }).click()
        await expect(rowFor(toDecline)).toHaveCount(0)
        expect((await author.get(`/api/reviews/${toDecline._id}`)).status()).toBe(200)
      })
    } finally {
      await deleteApiUser(reporter)
      await deleteApiUser(author) // also deletes the declined review and any reports on it
    }
  })
})
