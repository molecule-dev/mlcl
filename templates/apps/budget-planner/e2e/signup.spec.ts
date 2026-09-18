import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getMyUserId, signup, uniqueEmail, api } from './_helpers.js'

test('signup form renders with required name/email/password/confirm fields', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input#name')).toBeVisible()
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
  await expect(page.locator('input#confirm')).toBeVisible()
  await expect(page.getByRole('button', { name: /create\s*account/i })).toBeVisible()
})

test('Create account button creates a real user, sets accessToken, navigates to /dashboard', async ({
  page,
}) => {
  const email = uniqueEmail('signup')
  const password = 'TestPass123!'
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('New User')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('input#confirm').fill(password)
    await page.getByRole('button', { name: /create\s*account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(post?.status, 'POST /api/users must be 2xx').toBeLessThan(300)
  // Token persisted in localStorage
  const userId = await getMyUserId(page)
  expect(userId).toMatch(/^[0-9a-f-]{36}$/i)
  // Read-after-write: GET /api/profile/me returns the new user with the email we sent.
  const me = await api<Record<string, string>>(page, 'GET', '/profile/me')
  expect(me.email).toBe(email)
  expect(me.name).toBe('New User')
})

test('Mismatched password fields show alert and do NOT create user', async ({ page }) => {
  const email = uniqueEmail('mismatch')
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Mismatch User')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('TestPass123!')
    await page.locator('input#confirm').fill('Different456!')
    await page.getByRole('button', { name: /create\s*account/i }).click()
    await page.waitForTimeout(500)
  })
  await expect(page).toHaveURL(/\/signup/)
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(post, 'no POST /api/users should fire when passwords mismatch').toBeUndefined()
})

test('Show-password button toggles password visibility', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const pw = page.locator('input#password')
  await pw.fill('Secret123!')
  await expect(pw).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: /show password/i }).click()
  await expect(pw).toHaveAttribute('type', 'text')
})

test('Sign in link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('link', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
