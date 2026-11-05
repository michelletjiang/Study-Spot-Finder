// helpers.mjs
// Shared set-up for the Playwright specs: throw-away accounts made through the JSON API,
// so each test can arrange its data quickly and remove it afterwards.

// Unique per call so repeated runs never clash.
export function newAccount(prefix) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@example.com`,
    password: `E2e-pass-${id}`,
    school: ['SCIS']
  }
}

// Registers and logs in `account` on its own API context (its own cookie jar).
// Returns that context, so the test can act as this user without touching the browser page.
export async function apiUser(playwright, baseURL, account) {
  const ctx = await playwright.request.newContext({ baseURL })
  const reg = await ctx.post('/api/register', { data: account })
  if (reg.status() !== 201) throw new Error(`register failed: ${reg.status()} ${await reg.text()}`)
  const login = await ctx.post('/api/login', { data: { email: account.email, password: account.password } })
  if (!login.ok()) throw new Error(`login failed: ${login.status()}`)
  return ctx
}

// Deletes the logged-in account of `ctx` (which also removes its reviews, votes, favourites...).
export async function deleteApiUser(ctx) {
  await ctx.delete('/api/profile')
  await ctx.dispose()
}

// Logs the browser page in through the real login form.
export async function uiLogin(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'))
}

// Any study spot to test against.
export async function firstSpot(ctx) {
  const spots = await (await ctx.get('/api/spots')).json()
  if (!spots.length) throw new Error('no study spots in the database')
  return spots[0]
}

// A known room to test against, instead of whatever spot happens to come first in the database.
// Li Ka Shing Library level 3 has a floor plan and the noise heatmap, so the live features can be tested there.
export const TEST_BUILDING = 'Li Ka Shing Library'
export const TEST_FLOOR = '3'
export const TEST_ROOMS = ['RM3-1', 'RM3-2', 'RM3-3']

// Finds a study spot by building and room name through the API (ctx: any logged-in request context).
export async function findSpot(ctx, buildingName, name) {
  const spots = await (await ctx.get('/api/spots')).json()
  const spot = spots.find(s => s.buildingName === buildingName && s.name === name)
  if (!spot) throw new Error(`study spot not found: ${buildingName}, ${name} (run npm run seed:spots)`)
  return spot
}

// The admin test account from the README's Default Credentials. Override with ADMIN_EMAIL / ADMIN_PASSWORD.
export const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admintest@gmail.com',
  password: process.env.ADMIN_PASSWORD || '12345678'
}
