/**
 * /forgot-password and /reset-password — the user-facing recovery flow.
 *
 * Covers two regressions:
 *
 *   1. The `/forgot-password` form must POST `/api/users/forgot-password`
 *      and surface a confirmation card on success (the API always 200s
 *      to defeat user enumeration, so the UI has to acknowledge the
 *      request without revealing whether the email exists).
 *
 *   2. The `/reset-password` form must POST `/api/users/reset-password`.
 *      A previous scaffold shipped without that route mounted in
 *      `App/router.ts`, returning a 404 and silently breaking the only
 *      recovery path for users who forgot their password.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the email field + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i }).first()).toBeVisible()
  })

  test('submitting the form POSTs /api/users/forgot-password and shows confirmation', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('reset'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send reset link/i })
        .first()
        .click()
      await page.waitForTimeout(2_000)
    })
    const post = reqs.find((r) => /\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(post, 'Forgot password must POST /api/users/forgot-password').toBeDefined()
    expect(post?.status, 'forgot-password should always 200 (anti-enumeration)').toBe(200)
    await expect(page.getByText(/check your inbox/i)).toBeVisible()
  })
})

test.describe('/reset-password', () => {
  test('renders email + token + new-password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-render-token')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i }).first()).toBeVisible()
  })

  test('submitting the form POSTs /api/users/reset-password (route must exist)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-but-defined')
    await page.locator('input[type="email"]').first().fill('reset@flagship.test')
    await page.locator('input[type="password"]').first().fill('NewPass!1234')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset password/i })
        .first()
        .click()
      await page.waitForTimeout(2_000)
    })
    const post = reqs.find((r) => /\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(
      post,
      'Reset password must POST /api/users/reset-password (route was missing in earlier scaffolds and returned 404)',
    ).toBeDefined()
    // Token is invalid, so the API should reject with 401 — but the route
    // MUST exist (no 404). 404 here means the App/router.ts is broken.
    expect(post?.status, 'reset-password route must be mounted').not.toBe(404)
  })
})
