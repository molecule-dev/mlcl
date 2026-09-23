// Per-page spec for /signup. Auth contract + create-then-redirect.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('Signup form renders the three required inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.locator('input[type="text"]').first()).toBeVisible()
})

test('Signup with valid credentials hits /api/users and lands on /dashboard', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const email = uniqueEmail('weather-signup')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill('TestPass123456!')
  await page.locator('input[type="text"]').fill('Walker')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /sign\s*up/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url))
  expect(post?.status, 'signup POST should be 2xx').toBeGreaterThanOrEqual(200)
  expect(post?.status).toBeLessThan(300)
})

test('Signup with a pre-existing email returns 4xx and stays on /signup', async ({ page }) => {
  // The duplicate POST is SUPPOSED to fail — the browser logs that 4xx as
  // a console error, which this test intentionally exercises.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 4' })
  // Burn a user first.
  const existing = uniqueEmail('weather-dup')
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').fill(existing)
  await page.locator('input[type="password"]').fill('TestPass123456!')
  await page.locator('input[type="text"]').fill('Walker')
  await page.getByRole('button', { name: /sign\s*up/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  // Sign out and try to re-create with the same address.
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').fill(existing)
  await page.locator('input[type="password"]').fill('TestPass123456!')
  await page.locator('input[type="text"]').fill('Walker')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /sign\s*up/i }).click()
    await page.waitForTimeout(2500)
  })
  const dup = reqs.find((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url))
  expect(dup?.status, 'duplicate signup must be rejected').toBeGreaterThanOrEqual(400)
  await expect(page).toHaveURL(/\/signup/)
})

test('Signup page exposes a "Go back" button that navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const backBtn = page.getByRole('button', { name: /go back/i })
  await expect(backBtn).toBeVisible()
  await backBtn.click()
  await page.waitForURL(/\/login$/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe('/login')
})

test('Signup name field accepts a value (optional display name)', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const nameInput = page.locator('input[type="text"]').first()
  await nameInput.fill('Avery Walker')
  await expect(nameInput).toHaveValue('Avery Walker')
})
