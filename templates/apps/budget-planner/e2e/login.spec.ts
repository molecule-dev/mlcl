import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail, getAccessToken } from './_helpers.js'

test('login form renders email + password + submit', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i })).toBeVisible()
})

test('Login with correct credentials sets token and routes to /dashboard', async ({ page }) => {
  const { email, password } = await signup(page)
  // [M1-1] The bearer token now lives in memory + an httpOnly cookie, not
  // localStorage — so a localStorage.clear() alone leaves the session intact.
  // Clear cookies too to genuinely log the user out before the login round-trip.
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  expect(await getAccessToken(page)).toBeNull()
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.getByRole('button', { name: /sign\s*in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })
  })
  const logIn = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
  expect(logIn?.status).toBeLessThan(300)
  expect(await getAccessToken(page)).not.toBeNull()
})

test('Login with wrong password shows error and stays on /login', async ({ page }) => {
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill('WRONGwrong000!')
  await page.getByRole('button', { name: /sign\s*in/i }).click()
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('alert')).toBeVisible()
})

test('Forgot? link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /forgot/i }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('Create account link navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /create.*account/i }).click()
  await expect(page).toHaveURL(/\/signup/)
})
