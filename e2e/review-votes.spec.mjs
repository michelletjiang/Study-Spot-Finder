// review-votes.spec.mjs
// End-to-end test (Playwright) of up/downvoting reviews on the spot page.
// An "author" account writes a review through the API; a second "voter" account then votes on it
// in the browser. Both accounts are deleted at the end.
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, deleteApiUser, uiLogin, firstSpot } from './helpers.mjs'

test('a student can upvote, switch to downvote, and take back a vote', async ({ page, playwright, baseURL }) => {
  const authorAcc = newAccount('author')
  const voterAcc = newAccount('voter')
  const author = await apiUser(playwright, baseURL, authorAcc)
  const voter = await apiUser(playwright, baseURL, voterAcc)

  try {
    const spot = await firstSpot(author)
    const title = `Vote test ${authorAcc.username}`
    const created = await author.post('/api/reviews', {
      data: { spotId: spot._id, title, content: 'Temporary review for the vote test.', rating: 4, noiseLevel: 'Quiet' }
    })
    expect(created.status()).toBe(201)

    // The voter uses the real UI.
    await voter.dispose() // only needed it to create the account
    await uiLogin(page, voterAcc.email, voterAcc.password)
    await page.goto(`/spots/${spot._id}`)

    const votes = page.getByRole('group', { name: `Votes for ${title}` })
    const up = votes.getByRole('button', { name: 'Upvote' })
    const down = votes.getByRole('button', { name: 'Downvote' })

    await test.step('upvote', async () => {
      await expect(up).toHaveText('▲ 0')
      await up.click()
      await expect(up).toHaveText('▲ 1')
      await expect(up).toHaveAttribute('aria-pressed', 'true')
    })

    await test.step('switch to downvote (the upvote is removed, not doubled)', async () => {
      await down.click()
      await expect(down).toHaveText('▼ 1')
      await expect(up).toHaveText('▲ 0')
      await expect(down).toHaveAttribute('aria-pressed', 'true')
      await expect(up).toHaveAttribute('aria-pressed', 'false')
    })

    await test.step('click the same arrow again to take the vote back', async () => {
      await down.click()
      await expect(down).toHaveText('▼ 0')
      await expect(down).toHaveAttribute('aria-pressed', 'false')
    })

    await test.step('the vote is saved, not just shown', async () => {
      await up.click()
      await expect(up).toHaveText('▲ 1')
      await page.reload()
      await expect(votes.getByRole('button', { name: 'Upvote' })).toHaveText('▲ 1')
    })

    await test.step('authors cannot vote on their own review', async () => {
      const review = (await (await author.get(`/api/reviews?spotId=${spot._id}`)).json()).find(r => r.title === title)
      const res = await author.post(`/api/reviews/${review._id}/vote`, { data: { vote: 'up' } })
      expect(res.status()).toBe(403)
    })
  } finally {
    // Clean up: log the page's voter out by deleting that account, then the author.
    await page.request.delete('/api/profile')
    await deleteApiUser(author)
  }
})
