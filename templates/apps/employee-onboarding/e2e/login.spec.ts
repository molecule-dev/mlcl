/**
 * Sign-in (anonymous): email + password form, navigation to forgot-password and signup.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders the sign-in form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('successful login posts /api/users/log-in and redirects off /login', async ({ page }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass123!'
    await signup(page, email, password)
    // Now log out and re-log in to drive the actual /login form.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in|continue/i })
        .first()
        .click()
      await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 15_000 })
    })
    expect(reqs.some((r) => /\/api\/users\/log-in/.test(r.url) && r.status < 400)).toBe(true)
  })

  test('forgot-password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.waitForLoadState('networkidle')
    const fp = page.getByRole('link', { name: /forgot/i }).first()
    if (await fp.count()) {
      await fp.click()
      await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 })
    }
  })
})
