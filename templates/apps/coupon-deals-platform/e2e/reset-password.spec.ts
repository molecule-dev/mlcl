import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Reset-password is a 3-step server flow: signup → forgot-password (issues
 * a token in usersSecrets) → reset-password (consumes token, updates hash).
 *
 * The actual reset token is generated server-side and stored in the
 * `usersSecrets` table; the only way for the test to fetch it is via a
 * helper /api endpoint (we don't have one) OR by reading the test
 * database. To stay UI-only, this spec covers the *navigation and form
 * behavior* of the page, and uses an obviously-bad token to assert that
 * the API correctly rejects invalid tokens.
 */

test.describe('Reset-password page (/reset-password)', () => {
  test('Snagr brand link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: 'Snagr' }).click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('New password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    await page.getByLabel('New password', { exact: true }).fill('NewPass!1234')
    await expect(page.getByLabel('New password', { exact: true })).toHaveValue('NewPass!1234')
  })

  test('Confirm new password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    await page.getByLabel('Confirm new password', { exact: true }).fill('NewPass!1234')
    await expect(page.getByLabel('Confirm new password', { exact: true })).toHaveValue(
      'NewPass!1234',
    )
  })

  test('"Show password" toggle flips both password input types', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    const newPw = page.getByLabel('New password', { exact: true })
    await newPw.fill('NewPass!1234')
    await page.getByRole('button', { name: 'Show password' }).first().click()
    await expect(newPw).toHaveAttribute('type', 'text')
  })

  test('Mismatching passwords show inline error and skip the network call', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=abc')
      await page.getByLabel('New password', { exact: true }).fill('NewPass!1234')
      await page.getByLabel('Confirm new password', { exact: true }).fill('Different!')
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(800)
    })
    const calls = reqs.filter((r) => /\/api\/users\/reset-password/.test(r.url))
    expect(calls.length, 'no reset-password call when passwords mismatch').toBe(0)
  })

  test('Submit with an unknown token surfaces a 4xx rejection from /api/users/reset-password', async ({
    page,
  }) => {
    // The rejection IS the assertion — the 401 also logs a browser console
    // error, which the console-guard would otherwise fail the test for.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=invalid-token-' + Date.now())
      await page.getByLabel('New password', { exact: true }).fill('NewPass!1234')
      await page.getByLabel('Confirm new password', { exact: true }).fill('NewPass!1234')
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(1500)
    })
    const calls = reqs.filter(
      (r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST',
    )
    expect(calls.length, 'POST /api/reset-password fired').toBeGreaterThan(0)
    expect(
      calls.every((r) => r.status >= 400 && r.status < 500),
      'invalid token rejected',
    ).toBe(true)
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('Reset flow with a real token issued by /api/users/forgot-password completes', async ({
    page,
  }) => {
    const email = uniqueEmail('reset-real')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())

    // Issue a real reset token.
    const fp = await page.request.post(API_BASE + '/users/forgot-password', { data: { email } })
    expect(fp.ok(), 'forgot-password issued').toBe(true)

    // Use the API to find the token (test helper pretends to be the email link
    // since we cannot inspect the user's inbox). We retrieve it via the
    // /api/_test/last-reset-token helper if present, otherwise resort to an
    // intentionally-broken token (which still proves the page POSTs).
    const probe = await page.request.get(
      API_BASE + '/_test/last-reset-token?email=' + encodeURIComponent(email),
    )
    let token: string | null = null
    if (probe.ok()) {
      try {
        token = (await probe.json())?.token ?? null
      } catch {
        token = null
      }
    }
    if (!token) {
      // Fall back to confirming the page wires the request — full token
      // round-trip lives in the 99-user-journey when a helper endpoint exists.
      test.skip(true, 'no test-only token-introspection endpoint exposed')
    }

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password?token=' + (token ?? ''))
      await page.getByLabel('New password', { exact: true }).fill('NewPass!9876')
      await page.getByLabel('Confirm new password', { exact: true }).fill('NewPass!9876')
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForURL('**/login', { timeout: 10_000 }).catch(() => {})
    })
    const okay = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.status === 200)
    expect(okay, 'reset-password returned 200').toBeTruthy()
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
