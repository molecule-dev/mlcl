/**
 * /signup — create account.
 *
 * Per-page spec covering each row in observations/signup.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('"Start sharing" heading rendered on /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.getByRole('heading', { name: /start sharing/i })).toBeVisible()
})

test('first name input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input').nth(0).fill('Maya')
  await expect(page.locator('input').nth(0)).toHaveValue('Maya')
})

test('last name input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input').nth(1).fill('Walker')
  await expect(page.locator('input').nth(1)).toHaveValue('Walker')
})

test('email input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').fill('signup@example.com')
  await expect(page.locator('input[type="email"]')).toHaveValue('signup@example.com')
})

test('password input accepts text and is masked', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const pw = page.locator('input#password')
  await pw.fill('Secret123!')
  await expect(pw).toHaveValue('Secret123!')
  expect(await pw.getAttribute('type')).toBe('password')
})

test('Create account → POST /api/users → redirect to /explore', async ({ page }) => {
  const email = uniqueEmail('signup-net')
  const { reqs } = await captureNetwork(page, async () => {
    await signup(page, email)
  })
  await expect(page).toHaveURL(/\/explore/)
  const create = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
  expect(create, 'POST /api/users should fire on signup').toBeTruthy()
  expect([200, 201]).toContain(create!.status)
  // Sanity invariant: /api/users/me reflects the new user.
  const me = await page.request.get(`${API_BASE}/users/me`)
  expect(me.status()).toBe(200)
  expect((await me.json()).props.email).toBe(email)
})

test('Sign in link → /login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('link', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
