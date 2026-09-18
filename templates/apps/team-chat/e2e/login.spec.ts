/**
 * /login — bad credentials show error, good credentials land off /login,
 * forgot-password and signup links navigate correctly.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders the login form with email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('login with bogus credentials stays on /login (network 4xx)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .locator('input[type="email"]')
      .first()
      .fill('nobody-' + Date.now() + '@flagship.test')
    await page.locator('input[type="password"]').first().fill('WrongPass!9999')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    await expect(page).toHaveURL(/\/login/)
    const failed = reqs.find((r) => /\/api\/users\/log-in|\/api\/sessions/.test(r.url))
    if (failed) expect(failed.status).toBeGreaterThanOrEqual(400)
  })

  test('login with valid credentials lands off /login and persists token', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('login-good'))
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    const token = await getAccessToken(page)
    expect(token, 'JWT bearer should be present on success').toBeTruthy()
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/forgot-password"]').first()
    if (await link.count()) {
      await link.click()
    } else {
      await page
        .getByRole('link', { name: /forgot/i })
        .first()
        .click()
    }
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.locator('a[href="/signup"]').first()
    if (await link.count()) {
      await link.click()
    } else {
      await page
        .getByRole('link', { name: /create.*account|sign\s*up/i })
        .first()
        .click()
    }
    await page.waitForURL('**/signup', { timeout: 5000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
