/**
 * /login — bad credentials show error, good credentials land off /login,
 * the forgot-password and signup links navigate correctly.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders the login form with email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('login with bogus credentials stays on /login (network 4xx)', async ({ page }) => {
    // Expected 403 from the auth bond for bogus credentials — the console
    // guard would otherwise fail the test on the browser's own error log.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#login-email').fill('nobody-' + Date.now() + '@flagship.test')
    await page.locator('#login-password').fill('WrongPass!9999')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    await expect(page).toHaveURL(/\/login/)
    const failed = reqs.find((r) =>
      /\/api\/users\/log-in|\/api\/users\/sign-in|\/api\/sessions/.test(r.url),
    )
    if (failed) expect(failed.status).toBeGreaterThanOrEqual(400)
  })

  test('login with valid credentials lands off /login and persists token', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('login-good'))
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
    const token = await getAccessToken(page)
    expect(token, 'JWT bearer should be persisted on success').toBeTruthy()
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').first().click()
    await page.waitForURL('**/forgot-password', { timeout: 5_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await page.waitForURL('**/signup', { timeout: 5_000 })
    await expect(page.locator('#signup-email')).toBeVisible()
  })

  test('the login heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('email field accepts text input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const e = page.locator('#login-email')
    await e.fill('typed@example.com')
    expect(await e.inputValue()).toBe('typed@example.com')
  })

  test('password field is type=password and accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const p = page.locator('#login-password')
    expect(await p.getAttribute('type')).toBe('password')
    await p.fill('Secret123!')
    expect(await p.inputValue()).toBe('Secret123!')
  })
})
