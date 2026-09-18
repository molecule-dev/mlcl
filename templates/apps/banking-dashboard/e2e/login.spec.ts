/**
 * /login — bad credentials show inline error, good credentials land
 * post-login, navigation links work, password show/hide toggle flips.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders email + password fields and the submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('login with bogus credentials surfaces an inline alert and stays on /login', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill('nobody-' + Date.now() + '@flagship.test')
    await page.locator('input#password').fill('WrongPass!9999')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await expect(page.locator('[data-mol-id="login-error"], [role="alert"]').first()).toBeVisible(
        {
          timeout: 8000,
        },
      )
    })
    await expect(page).toHaveURL(/\/login/)
    const failed = reqs.find((r) => /\/api\/users\/log-in/.test(r.url))
    expect(failed?.status, JSON.stringify(reqs)).toBeGreaterThanOrEqual(400)
  })

  test('login with valid credentials lands off /login with token persisted', async ({ page }) => {
    const { email, password } = await signup(page, uniqueEmail('login-good'))
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('form button[type="submit"]').click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    const tok = await getAccessToken(page)
    expect(tok).toBeTruthy()
  })

  test('"Forgot password?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('"Sign up" footer link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await page.waitForURL('**/signup', { timeout: 5000 })
    await expect(page.locator('input#email')).toBeVisible()
  })

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input#password')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('login with empty fields does not POST (HTML required attribute)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await page.waitForTimeout(500)
    })
    const sessionCalls = reqs.filter((r) => /\/api\/users\/log-in/.test(r.url))
    expect(sessionCalls, JSON.stringify(sessionCalls)).toEqual([])
  })

  test('OAuth buttons render when configured (do not assert provider redirect)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/login')
    const oauth = page.getByRole('button', { name: /google|github|apple|gitlab|twitter/i })
    if ((await oauth.count()) > 0) {
      await expect(oauth.first()).toBeVisible()
    }
  })

  test('submitting valid creds via captureNetwork shows POST /api/users/log-in', async ({
    page,
  }) => {
    const { email, password } = await signup(page, uniqueEmail('login-net'))
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    })
    const ok = reqs.find(
      (r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST' && r.status === 200,
    )
    expect(ok, JSON.stringify(reqs)).toBeTruthy()
  })
})
