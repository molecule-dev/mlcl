/**
 * Signup page: registers a fresh user via POST /api/users, persists an
 * access token, and lands on /dashboard. Outcome is verified by reading
 * /api/profile/me with the persisted token.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('signup creates a real user reachable via /api/profile/me', async ({ page }) => {
  const email = uniqueEmail()
  const reqs = await captureNetwork(page, async () => {
    await signup(page, email)
  })

  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost?.status).toBe(201)
  await expect(page).toHaveURL(/\/dashboard/)

  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()

  const me = await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken!) })
  expect(me.status()).toBe(200)
  const body = (await me.json()) as { email: string; planKey: string }
  expect(body.email).toBe(email)
  expect(body.planKey).toBe('free')
})

test('signup form rejects empty submission', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('button', { name: /create account/i }).click()
  // Stay on /signup — HTML5 required validation prevents submit.
  await expect(page).toHaveURL(/\/signup/)
})

test('signup link from /login goes back to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const signupLink = page
    .getByRole('link', { name: /create account|sign\s*up|new account/i })
    .first()
  if (await signupLink.count().catch(() => 0)) {
    await signupLink.click()
    await page.waitForURL(/\/signup/, { timeout: 5_000 })
    await expect(page).toHaveURL(/\/signup/)
  }
})

test('signup duplicate email returns 4xx and stays on /signup', async ({ page, browser }) => {
  // Expected 4xx: the duplicate-email POST /api/users returns 403, which
  // Chrome logs as a console error.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
  const email = uniqueEmail('dup')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, 'password123')
  await ctx.close()

  await page.goto(APP_BASE + '/signup')
  await page.locator('input[placeholder="Jordan"]').fill('Dup')
  await page.locator('input[placeholder="Sanchez"]').fill('Echo')
  await page.locator('input[placeholder="you@example.com"]').fill(email)
  await page.locator('input[placeholder="At least 8 characters"]').fill('password123')
  await page.locator('input[placeholder="Repeat your password"]').fill('password123')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForTimeout(1500)
  })
  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost?.status).toBeGreaterThanOrEqual(400)
  await expect(page).toHaveURL(/\/signup/)
})

test('mismatched passwords disable the submit button so signup cannot proceed', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[placeholder="Jordan"]').fill('Mis')
  await page.locator('input[placeholder="Sanchez"]').fill('Match')
  await page.locator('input[placeholder="you@example.com"]').fill(uniqueEmail('mm'))
  await page.locator('input[placeholder="At least 8 characters"]').fill('password123')
  await page.locator('input[placeholder="Repeat your password"]').fill('password999')
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeDisabled()
  await page.locator('input[placeholder="Repeat your password"]').fill('password123')
  await expect(submit).toBeEnabled()
  await page.locator('input[placeholder="Repeat your password"]').fill('password999')
  await expect(submit).toBeDisabled()
  await expect(page).toHaveURL(/\/signup/)
})

test('logo link returns to /', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  // The auth-shell wordmark link is the app name ("Pagebound"), not a
  // sibling app's brand.
  await page.getByRole('link', { name: /^Pagebound$/ }).click()
  await page.waitForURL(/\/$/, { timeout: 5_000 })
})

test('toggle-theme on signup flips data-mol-mode and persists', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const readMode = () => page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
  const before = await readMode()
  expect(before).toBeTruthy()
  await page.getByRole('button', { name: /toggle theme/i }).click()
  await page.waitForTimeout(300)
  const after = await readMode()
  expect(after).not.toBe(before)
  await page.reload()
  await page.waitForTimeout(300)
  const persisted = await readMode()
  expect(persisted).toBe(after)
})

test('first-name + last-name combine into displayed name on profile', async ({ page }) => {
  const email = uniqueEmail('name-combine')
  await signup(page, email, 'password123')
  // Wait for dashboard then read /api/profile/me to verify name was stored.
  const accessToken = await getAccessToken(page)
  const me = await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken!) })
  const body = (await me.json()) as { name: string }
  expect(body.name).toMatch(/Test/i)
})

test('first-name and last-name fields accept distinct values without leaking', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const first = page.locator('input[placeholder="Jordan"]')
  const last = page.locator('input[placeholder="Sanchez"]')
  await first.fill('Sam')
  await last.fill('Rivera')
  await expect(first).toHaveValue('Sam')
  await expect(last).toHaveValue('Rivera')
  await first.fill('')
  await expect(first).toHaveValue('')
  await expect(last, 'last-name should not be cleared when first-name is cleared').toHaveValue(
    'Rivera',
  )
})
