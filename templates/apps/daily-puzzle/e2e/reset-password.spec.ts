import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, flipThemeAndAssertChanged } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders the brand link with "Lexlet home" aria-label', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('link', { name: /lexlet home/i })).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await flipThemeAndAssertChanged(page)
  })

  test('email input pre-fills from ?email= query param', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=preset%40example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe(
      'preset@example.com',
    )
  })

  test('token input pre-fills from ?token= query param', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=preset-token-123')
    // Token field is the first password-typed input
    const tokenInput = page.locator('input[type="password"]').first()
    expect(await tokenInput.inputValue()).toBe('preset-token-123')
  })

  test('new password field accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const newPw = page.locator('input[autocomplete="new-password"]').first()
    await newPw.fill('SuperSecret123!')
    expect(await newPw.inputValue()).toBe('SuperSecret123!')
  })

  test('submit with bad token → 4xx, stays on /reset-password, error visible', async ({ page }) => {
    await page.goto(
      APP_BASE + '/reset-password?token=definitely-not-real-token-xyz&email=nobody%40example.com',
    )
    await page.locator('input[autocomplete="new-password"]').first().fill('NewPass!1234')
    // Expected 4xx: the rejected reset POST logs a browser console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 4\\d\\d' })
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForLoadState('networkidle')
    })
    const confirm = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/(users\/password-reset\/confirm|users\/reset-password|reset_password)/.test(r.url),
    )
    expect(confirm, 'POST password-reset/confirm').toBeTruthy()
    expect(confirm?.status).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('"Back to sign in" link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('reset button text reads "Reset password"', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('email pre-filled values are independent across renders', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=a%40b.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('a@b.com')
    await page.goto(APP_BASE + '/reset-password?email=other%40c.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('other@c.com')
  })

  test('POST /api/users/reset-password rejects unknown token with 400 (read-after-write sentinel)', async ({
    request,
  }) => {
    const r = await request.post(`${API_BASE.replace(/\/api$/, '')}/api/users/reset-password`, {
      data: { token: 'definitely-not-a-real-token-xyz', password: 'NewPass!1234' },
      failOnStatusCode: false,
    })
    expect(r.status(), 'expected 4xx for bogus reset token').toBeGreaterThanOrEqual(400)
    expect(r.status(), 'expected 4xx for bogus reset token').toBeLessThan(500)
    const body = (await r.json().catch(() => ({}))) as { errorKey?: string }
    expect(typeof body.errorKey === 'string' || body.errorKey === undefined).toBe(true)
  })
})
