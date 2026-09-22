/**
 * /signup — public signup form. Verifies required fields, real DB write,
 * and successful redirect into /dashboard.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test('/signup renders all three required inputs and a submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('[data-mol-id="signup-name"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="signup-email"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="signup-password"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="signup-submit"]')).toBeVisible()
})

test('/signup submission posts /api/users and redirects to /dashboard', async ({ page }) => {
  const email = uniqueEmail('signup')
  await page.goto(APP_BASE + '/signup')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="signup-name"]').fill('Sign Test')
    await page.locator('[data-mol-id="signup-email"]').fill(email)
    await page.locator('[data-mol-id="signup-password"]').fill('SignTest123!')
    await page.locator('[data-mol-id="signup-submit"]').click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  })
  const create = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
  expect(create?.status).toBe(201)
})

test('/signup persists access token after success', async ({ page }) => {
  const email = uniqueEmail('signup')
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-mol-id="signup-name"]').fill('Token Test')
  await page.locator('[data-mol-id="signup-email"]').fill(email)
  await page.locator('[data-mol-id="signup-password"]').fill('TokenTest123!')
  await page.locator('[data-mol-id="signup-submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  const tok = await getAccessToken(page)
  expect(tok && tok.length).toBeTruthy()
})

test('/signup duplicate-email submission stays on the form with an error', async ({ page }) => {
  const email = uniqueEmail('dupe')
  // The duplicate POST /api/users legitimately 403s; Chrome logs every
  // failed response to the console, so arm the console-guard exemption
  // BEFORE the submit (regex matches the console text, not the status).
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
  // Seed one
  const seed = await page.request.post(`${API_BASE}/users`, {
    data: { email, password: 'DupePass123!', name: 'Dupe' },
    failOnStatusCode: false,
  })
  expect(seed.status()).toBe(201)
  // Try again from UI
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-mol-id="signup-name"]').fill('Dupe Two')
  await page.locator('[data-mol-id="signup-email"]').fill(email)
  await page.locator('[data-mol-id="signup-password"]').fill('DupePass123!')
  await page.locator('[data-mol-id="signup-submit"]').click()
  // Should NOT navigate to /dashboard.
  await page.waitForTimeout(2000)
  expect(new URL(page.url()).pathname).not.toBe('/dashboard')
})

test('/signup name input accepts free-text without breaking submit', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const nameInput = page.locator('[data-mol-id="signup-name"]')
  await nameInput.fill("Sam O'Brien-María")
  await expect(nameInput).toHaveValue("Sam O'Brien-María")
})

test('/signup show-password toggle flips input type between password and text', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  const pwd = page.locator('[data-mol-id="signup-password"]')
  await expect(pwd).toHaveAttribute('type', 'password')
  await page.locator('[data-mol-id="signup-toggle-password"]').click()
  await expect(pwd).toHaveAttribute('type', 'text')
  await page.locator('[data-mol-id="signup-toggle-password"]').click()
  await expect(pwd).toHaveAttribute('type', 'password')
})

test('/signup login link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-mol-id="signup-login-link"]').click()
  await page.waitForURL(/\/login/, { timeout: 5_000 })
  expect(new URL(page.url()).pathname).toBe('/login')
})
