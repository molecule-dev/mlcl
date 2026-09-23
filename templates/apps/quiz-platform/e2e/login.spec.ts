import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  bearerToken,
  captureNetwork,
  flipThemeAndAssertChanged,
  getAccessToken,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/login', () => {
  test('renders the brand link with "Sparq home" aria-label', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('link', { name: /sparq home/i })).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await flipThemeAndAssertChanged(page)
  })

  test('email input accepts and preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('demo@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('demo@example.com')
  })

  test('password input accepts and preserves typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="password"]').first().fill('hunter2')
    expect(await page.locator('input[type="password"]').first().inputValue()).toBe('hunter2')
  })

  test('"Forgot password?" link → /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('valid credentials POST /api/users/log-in, set bearer, navigate to /discover', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await context.clearCookies()
    await page
      .evaluate(() => {
        try {
          localStorage.clear()
        } catch {}
      })
      .catch(() => undefined)
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/discover/)
    const sess = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(sess, 'POST /api/users/log-in').toBeTruthy()
    expect(sess?.status).toBeLessThan(400)
    const token = await bearerToken(page)
    expect(token).toBeTruthy()
  })

  test('"Create an account" link → /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /create an account|sign\s*up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button is present', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('bad credentials → POST /api/users/log-in returns 4xx, no token, stays on /login', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login-bad')
    await signup(page, email, 'TestPass!1234')
    // Sign out the just-created session before attempting the bad login:
    // the bearer token is the httpOnly `token` cookie (see getAccessToken),
    // so the "no token" assertion below is only meaningful from a clean,
    // unauthenticated state. localStorage.clear() alone leaves the cookie.
    await context.clearCookies()
    await page
      .evaluate(() => {
        try {
          localStorage.clear()
        } catch {}
      })
      .catch(() => undefined)
    await page.goto(APP_BASE + '/login')
    // The 403 from the bad login logs a browser console error by design —
    // allow it (regex matches console text) so the guard doesn't fail the test.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 40[13]',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('WrongPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForLoadState('networkidle')
    })
    const sess = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(sess?.status).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/login/)
    const token = await getAccessToken(page)
    expect(token).toBeFalsy()
  })

  test('successful login persists a non-empty bearer token (read-after-write)', async ({
    page,
  }) => {
    const email = uniqueEmail('login-token')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await page.evaluate(() => {
      try {
        localStorage.clear()
      } catch {}
    })
    await login(page, email, password)
    const t = await bearerToken(page)
    expect(t.length).toBeGreaterThan(8)
  })
})
