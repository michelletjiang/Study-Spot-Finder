// student-journey.spec.mjs
// End-to-end test (Playwright) of the main student journey, through the real Vue UI:
//   register -> log in -> open a study spot -> favourite it -> write (with a noise level) and edit a review
//   -> a second student reports it (the author cannot) -> delete the review (its report must go too)
//   -> delete the account (its favourites must go too).
//
// It creates its own throw-away account with a unique name and deletes it at the end,
// so it can be run again and again against the shared team database without leaving data behind.
// Selectors use roles and visible labels (getByRole / getByLabel), which survive styling changes.
//
// Run: start the app with `npm run dev`, then `npm run test:e2e`.

import { test, expect } from '@playwright/test'
import { newAccount, apiUser, deleteApiUser } from './helpers.mjs'

// Unique per run so repeated runs never clash.
const stamp = Date.now().toString(36)
const account = {
  username: `e2e_${stamp}`,
  email: `e2e_${stamp}@example.com`,
  password: `E2e-pass-${stamp}`
}
const reviewTitle = `E2E review ${stamp}`
const editedTitle = `E2E review ${stamp} (edited)`

// If a step fails, still delete the test account (and with it its review and favourites), so failed runs leave
// nothing behind. After a successful run the account is already gone and this does nothing.
test.afterEach(async ({ page }) => {
  await page.request.delete('/api/profile').catch(() => {})
})

// Steps share the browser page, so run them in order in one test.
test('student journey: favourite, review, report, and clean deletes', async ({ page, playwright, baseURL }) => {
  // The app asks "Delete ...?" with confirm(); accept it like a user clicking OK.
  page.on('dialog', dialog => dialog.accept())

  await test.step('register a new account', async () => {
    await page.goto('/register')
    await page.getByLabel('Username').fill(account.username)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByLabel('School of Computing and Information Systems').check()
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/login\?registered=1/)
    await expect(page.getByText('Account created. Log in with your new email.')).toBeVisible()
  })

  await test.step('log in', async () => {
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page).toHaveURL(/\/$/)
  })

  // Pick any existing spot through the API (the page's login cookie is shared with page.request).
  let spot
  await test.step('open a study spot', async () => {
    const res = await page.request.get('/api/spots')
    expect(res.ok()).toBeTruthy()
    const spots = await res.json()
    expect(spots.length).toBeGreaterThan(0)
    spot = spots[0]

    await page.goto(`/spots/${spot._id}`)
    await expect(page.getByRole('heading', { name: spot.name })).toBeVisible()
  })

  await test.step('add the spot to favourites', async () => {
    await page.waitForLoadState('networkidle') // the page loads the student's favourites first
    await page.getByRole('button', { name: 'Save to favourites', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Saved to favourites', exact: true })).toBeVisible()

    await page.goto('/favourites')
    await expect(page.getByRole('heading', { name: spot.name, exact: true })).toBeVisible()
  })

  await test.step('write a review', async () => {
    await page.goto(`/spots/${spot._id}`)
    await page.getByRole('link', { name: '+ Write a review' }).click()
    await page.getByLabel('Title').fill(reviewTitle)
    await page.getByLabel('Your review', { exact: true }).fill('Quiet in the morning, plenty of sockets.')
    await page.locator('label').filter({ has: page.getByRole('radio', { name: '4 stars', exact: true }) }).click()
    await page.getByLabel('Noise level').selectOption('Quiet')
    await page.getByRole('button', { name: 'Post review' }).click()

    await expect(page).toHaveURL(new RegExp(`/spots/${spot._id}$`))
    await expect(page.getByText(reviewTitle)).toBeVisible()
    await expect(page.locator('article').filter({ hasText: reviewTitle })).toContainText('Noise: Quiet')
  })

  // The block on the spot page that holds our review (its own Edit / Delete / Report links).
  // (matched by text, since the title shares its heading with the star rating; the edited title is checked after the
  // original one is gone, so the two never match the same review)
  const ourReview = (title) => page.locator('article').filter({ hasText: title })

  await test.step('edit the review', async () => {
    await ourReview(reviewTitle).getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('heading', { name: 'Edit your review' })).toBeVisible()
    // wait for the form to load the review first, or the loaded title would overwrite what we type
    await expect(page.getByLabel('Title')).toHaveValue(reviewTitle)
    await page.getByLabel('Title').fill(editedTitle)
    await page.getByLabel('Noise level').selectOption('Loud')
    await page.getByRole('button', { name: 'Save review' }).click()

    await expect(page).toHaveURL(new RegExp(`/spots/${spot._id}$`))
    await expect(page.getByText(editedTitle)).toBeVisible()
    await expect(page.locator('article').filter({ hasText: editedTitle })).toContainText('Noise: Loud')
  })

  // A second throw-away student, used only through the API, who reports the review.
  let reporter
  let reportId
  await test.step('the author cannot report their own review', async () => {
    await expect(ourReview(editedTitle).getByRole('link', { name: 'Report', exact: true })).toHaveCount(0)
    const reviews = await (await page.request.get(`/api/reviews?spotId=${spot._id}`)).json()
    const ours = reviews.find(r => r.title === editedTitle)
    const res = await page.request.post('/api/reports', { data: { reviewId: ours._id, reason: 'Spam', description: 'Self report' } })
    expect(res.status()).toBe(403)
  })

  await test.step('another student reports the review', async () => {
    reporter = await apiUser(playwright, baseURL, newAccount('reporter'))
    const reviews = await (await reporter.get(`/api/reviews?spotId=${spot._id}`)).json()
    const ours = reviews.find(r => r.title === editedTitle)
    const res = await reporter.post('/api/reports', { data: { reviewId: ours._id, reason: 'Spam', description: 'E2E test report, safe to ignore.' } })
    expect(res.status()).toBe(201)
    reportId = (await res.json())._id
    expect((await reporter.get(`/api/reports/${reportId}`)).status()).toBe(200)
    // Reporting the same review again while the first report is pending is refused.
    const again = await reporter.post('/api/reports', { data: { reviewId: ours._id, reason: 'Spam', description: 'Again' } })
    expect(again.status()).toBe(409)
  })

  await test.step('deleting the review also deletes its report', async () => {
    await page.goto(`/spots/${spot._id}`)
    await ourReview(editedTitle).getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText(editedTitle)).toHaveCount(0)
    // Cascade check: the report on the deleted review is gone too.
    expect((await reporter.get(`/api/reports/${reportId}`)).status()).toBe(404)
    await deleteApiUser(reporter)
  })

  await test.step('deleting the account removes it and logs out', async () => {
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Delete my account' }).click()
    await expect(page).toHaveURL(/\/login/)

    // The account no longer exists, so logging in fails.
    const login = await page.request.post('/api/login', { data: { email: account.email, password: account.password } })
    expect(login.ok()).toBeFalsy()
  })
})
