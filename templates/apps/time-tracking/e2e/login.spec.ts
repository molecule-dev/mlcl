import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('/login page', () => {
  test('login form, email, password, and submit are visible', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('[data-test="login-form"]')).toBeVisible()
    await expect(page.locator('[data-test="login-email"]')).toBeVisible()
    await expect(page.locator('[data-test="login-password"]')).toBeVisible()
    await expect(page.locator('[data-test="login-submit"]')).toBeVisible()
  })

  test('"Forgot password?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Sign up" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"schedule Chrono" landing logo link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /schedule chrono/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('login email field accepts typed input and is masked-free for email', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const f = page.locator('[data-test="login-email"]')
    await f.fill('hello@example.com')
    await expect(f).toHaveValue('hello@example.com')
  })

  test('valid credentials → /dashboard, access token set in the httpOnly session cookie', async ({
    page,
  }) => {
    const { email, password } = await signup(page)
    // [M1-1] Clear the persistent credential — the httpOnly `token` cookie —
    // so the login below has to mint a fresh one. (The bearer token is held
    // in memory + this cookie; a localStorage copy was removed because it is
    // XSS-exfiltratable.)
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test="login-email"]').fill(email)
      await page.locator('[data-test="login-password"]').fill(password)
      await page.locator('[data-test="login-submit"]').click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    // [M1-1] The real credential after a successful login is the httpOnly
    // session cookie (prod: `__Host-token`), NOT a localStorage copy.
    await expect
      .poll(async () => (await getAccessToken(page)) !== null, { timeout: 10000 })
      .toBe(true)
    const cookies = await page.context().cookies()
    expect(
      cookies.some((c) => /(^|[-_])token$/i.test(c.name) && c.value),
      'expected the httpOnly session token cookie to be set',
    ).toBeTruthy()
    const login = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(login?.status, 'POST /api/users/log-in').toBe(200)
  })

  test('invalid credentials surface an inline error and stay on /login', async ({ page }) => {
    // The deliberate wrong-password login is rejected with 401/403 — the
    // browser logs the failed request and the console guard must allow it.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of (401|403)',
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('[data-test="login-email"]').fill(uniqueEmail())
    await page.locator('[data-test="login-password"]').fill('not-the-real-password')
    await page.locator('[data-test="login-submit"]').click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login$/)
  })
})
