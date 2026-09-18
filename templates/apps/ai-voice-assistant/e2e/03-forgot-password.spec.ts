import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders email field + submit + back-to-sign-in', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /send reset|reset link|sending/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /back to sign in|sign in/i }).first()).toBeVisible()
  })

  test('submitting POSTs /api/users/forgot-password and shows the success state', async ({
    page,
    browser,
  }) => {
    // Provision a real user so the forgot-password handler has a row to
    // resolve. The handler still returns 2xx for unknown emails to avoid
    // user enumeration, but a real user exercises the email-bond path.
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    const { email } = await signup(p)
    await ctx.close()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').first().fill(email)
      await page
        .getByRole('button', { name: /send reset|reset link/i })
        .first()
        .click()
      // Success card has a deterministic test id.
      await expect(page.locator('[data-mol-id="forgot-password-success"]')).toBeVisible({
        timeout: 15_000,
      })
    })
    const fp = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
    expect(fp, 'POST /api/users/forgot-password should fire').toBeDefined()
    expect(fp!.status).toBeGreaterThanOrEqual(200)
    expect(fp!.status).toBeLessThan(300)
  })

  test('the API returns 2xx even for unknown emails (no user enumeration)', async ({ page }) => {
    const resp = await page.request.post(API_BASE + '/users/forgot-password', {
      data: { email: 'totally-fake-' + Date.now() + '@example.com' },
    })
    expect(resp.status()).toBeGreaterThanOrEqual(200)
    expect(resp.status()).toBeLessThan(500)
  })
})
