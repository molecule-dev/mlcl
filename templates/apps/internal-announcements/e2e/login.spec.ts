/**
 * /login — bad credentials show error, good credentials land off /login,
 * and JWT is persisted.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders the login form with email + password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('login with bogus credentials stays on /login (network 4xx)', async ({ page }) => {
    // Bad credentials returning 4xx is the contract — allow the expected
    // console resource error in the console-error guard.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(`nobody-${Date.now()}@flagship.test`)
    await page.locator('input[type="password"]').fill('WrongPass!9999')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    await expect(page).toHaveURL(/\/login/)
    const failed = reqs.find((r) => /\/api\/users\/log-in/.test(r.url))
    if (failed) expect(failed.status).toBeGreaterThanOrEqual(400)
  })

  test('login with valid credentials lands on /feed and persists token', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('login-good'))
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).toHaveURL(/\/feed/, { timeout: 15000 })
    const token = await getAccessToken(page)
    expect(token, 'JWT bearer should be persisted on success').toBeTruthy()
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/forgot-password"]').first()
    if ((await link.count()) > 0) {
      await link.click()
    } else {
      await page
        .getByRole('link', { name: /forgot/i })
        .first()
        .click()
    }
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/signup"]').first()
    await link.click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })
})
