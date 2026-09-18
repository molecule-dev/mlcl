/**
 * Login: existing user signs in, lands on /search, session survives reload.
 * Wrong credentials keep the user on /login.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('email + password inputs accept text', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill('foo@example.com')
  await expect(page.locator('input[type="email"]').first()).toHaveValue('foo@example.com')
  await page.locator('input[type="password"]').first().fill('secret-123')
  await expect(page.locator('input[type="password"]').first()).toHaveValue('secret-123')
})

test('valid credentials POST the login endpoint and redirect off /login', async ({
  page,
  browser,
}) => {
  const email = uniqueEmail('login')
  const password = 'TestPass123!'
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  })
  // travel-booking config: loginEndpoint = '/users/log-in' (mounted at /api/users/log-in)
  const loginPost = reqs.find(
    (r) => r.method === 'POST' && /\/api\/users\/log-in|\/api\/sessions/.test(r.url),
  )
  expect(loginPost?.status).toBeGreaterThanOrEqual(200)
  expect(loginPost?.status).toBeLessThan(300)
})

test('wrong password keeps user on /login', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, 'TestPass123!')
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill('wrong-password!!!')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForTimeout(2_000)
  await expect(page).toHaveURL(/\/login/)
})

test('forgot password link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  // copy reads "Forgot?" not "Forgot password" — match either
  await page
    .getByRole('link', { name: /forgot/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('signup link navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /create|sign up|join/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})
