import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, login, logout, uniqueEmail } from './_helpers.js'

test.describe('helpdesk-ticketing: /login', () => {
  test('GET /login renders the form and a Forgot-password link', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"], #email').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('input[type="password"], #password').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible()
  })

  test('round-trip: signup → logout → /login → land back on /', async ({ page }) => {
    const { email, password } = await signup(page)
    await logout(page)
    await login(page, email, password)
    await expect(page).toHaveURL(APP_BASE + '/', { timeout: 10_000 })
  })

  test('login with an unknown email keeps the user on /login', async ({ page }) => {
    // The expected 403 (invalid credentials) logs a browser console error —
    // allowlisted so the console guard doesn't fail an assertion about the URL.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email, input[type="email"]').first().fill(uniqueEmail('nobody'))
    await page.locator('#password, input[type="password"]').first().fill('does-not-exist')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(750)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login submit posts to /api/users/log-in (captured)', async ({ page }) => {
    const { email, password } = await signup(page)
    await logout(page)
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/users/log-in'))).toBe(true)
  })
})
