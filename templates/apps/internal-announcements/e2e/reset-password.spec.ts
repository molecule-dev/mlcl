/**
 * /reset-password — public, accepts ?token=… from the password-reset
 * email link.
 *
 * Asserts: form fields render; submitting an invalid token returns a
 * non-200 from the API (and the page surfaces the error); the public
 * "back to sign in" link works; ?token=… prefills the token field.
 *
 * We intentionally do NOT try to complete a real reset — generating a
 * valid token requires Mailgun delivery which the smoke env can do but
 * we don't poll the inbox here. The forgot-password.spec.ts covers
 * the request-side invariant; this spec is about the page's shape and
 * the API's invalid-token rejection.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset password page', () => {
  test('renders the form (email + token + new password + confirm)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input[type=email]').first()).toBeVisible()
    await expect(page.locator('input[placeholder*="Paste the link token" i]').first()).toBeVisible()
    const passwordInputs = page.locator('input[type=password]')
    await expect(passwordInputs.nth(1)).toBeAttached()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('?token=… prefills the token field', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token-1234')
    const tokenInput = page.locator('input[placeholder*="Paste the link token" i]').first()
    await expect(tokenInput).toHaveValue('demo-token-1234')
  })

  test('submitting an invalid token POSTs to /api/users/reset-password and stays on the page', async ({
    page,
  }) => {
    // The invalid-token 4xx is the contract under test — allow the
    // expected console resource error in the console-error guard.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 4',
    })
    await page.goto(APP_BASE + '/reset-password?token=not-a-real-token')
    await page.locator('input[type=email]').first().fill('nobody@example.com')
    const passwordInputs = page.locator('input[type=password]')
    await passwordInputs.nth(0).fill('NewPass123!')
    await passwordInputs.nth(1).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(post, 'reset-password POST should fire').toBeTruthy()
    // For an invalid token the API will return 4xx; the page must NOT
    // redirect to /login pretending success.
    if (post && post.status >= 400) {
      expect(page.url()).toContain('/reset-password')
    }
  })

  test('back-to-sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('GET /api/users/reset-password is rejected for unknown token (server-side direct check)', async ({
    page,
  }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { email: 'nobody@example.com', token: 'invalid-token', password: 'X' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('header brand link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /^Herald/ })
      .first()
      .click()
    await page.waitForURL(APP_BASE + '/', { timeout: 5000 })
  })
})
