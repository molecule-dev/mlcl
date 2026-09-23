import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bearerToken,
  captureNetwork,
  flipThemeAndAssertChanged,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/signup', () => {
  test('renders the brand link with "Sparq home" aria-label', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('link', { name: /sparq home/i })).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await flipThemeAndAssertChanged(page)
  })

  test('display name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('textbox', { name: /display name|your name|name/i })
      .first()
      .fill('Alice')
    expect(
      await page
        .getByRole('textbox', { name: /display name|your name|name/i })
        .first()
        .inputValue(),
    ).toBe('Alice')
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="email"]').first().fill('alice@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('alice@example.com')
  })

  test('password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[type="password"]').first().fill('hunter22!')
    expect(await page.locator('input[type="password"]').first().inputValue()).toBe('hunter22!')
  })

  test('valid signup creates user, sets bearer, navigates away from /signup', async ({ page }) => {
    const email = uniqueEmail('signup-ok')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass!1234')
    })
    await expect(page).not.toHaveURL(/\/signup$/)
    const userCreate = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(userCreate, 'POST /api/users (create)').toBeTruthy()
    expect(userCreate?.status).toBeLessThan(400)
    const token = await bearerToken(page)
    expect(token.length).toBeGreaterThan(8)
    // Read-after-write: decode the user-id from the token payload and
    // confirm GET /api/users/{id} succeeds.
    const userId = await (async () => {
      try {
        const payload = token.split('.')[1] ?? ''
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        return decoded.sub ?? decoded.userId ?? decoded.id ?? null
      } catch {
        return null
      }
    })()
    expect(userId).toBeTruthy()
    const me = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(token),
      failOnStatusCode: false,
    })
    expect(me.status()).toBeLessThan(400)
  })

  test('duplicate-email signup → POST /api/users returns 4xx, stays on /signup', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('signup-dup')
    await signup(page, email, 'TestPass!1234')
    // The expected 4xx logs a browser console error by design — allow it.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 4[0-9][0-9]',
    })
    await context.clearCookies()
    await page
      .evaluate(() => {
        try {
          localStorage.clear()
        } catch {}
      })
      .catch(() => undefined)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page
        .getByRole('textbox', { name: /display name|name/i })
        .first()
        .fill('Dupe')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForLoadState('networkidle')
    })
    const userCreate = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(userCreate?.status).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
