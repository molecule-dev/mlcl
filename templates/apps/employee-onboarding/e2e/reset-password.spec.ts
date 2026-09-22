/**
 * Reset-password lifecycle.
 *
 * Asserts both the negative path (the molecule resetPassword handler must
 * reject missing token / missing password / short password / unknown token
 * with the proper status codes) AND the positive path: the form posts to
 * /api/users/reset-password and the auth client's resetPasswordEndpoint is
 * pointed at the right place. A separate full-lifecycle integration test
 * (signup → DB token → reset → login with new pw) is covered in
 * auth-flows.spec.ts so we don't duplicate the postgres dependency here.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('without a token, page still renders the password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('form submission POSTs to /api/users/reset-password and is rejected for an invalid token', async ({
    page,
  }) => {
    // The whole point is a 401 from the reset endpoint — tell the console
    // guard that the browser's "status of 401" resource error is expected.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    // Pass email + token via querystring so neither field renders as required.
    await page.goto(
      APP_BASE +
        '/reset-password?token=clearly-invalid-token&email=anybody-' +
        Date.now() +
        '@example.com',
    )
    await page.waitForLoadState('networkidle')
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill('NewPass123!')
    if ((await pw.count()) > 1) await pw.nth(1).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|set|update|continue/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    const rp = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(rp, 'reset-password POST must fire on form submit').toBeTruthy()
    expect(rp!.status, 'invalid token must be rejected').toBeGreaterThanOrEqual(400)
    expect(rp!.status).toBeLessThan(500)
  })

  test('direct API: missing token returns 400', async ({ page }) => {
    const r = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { password: 'NewPass123!' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)
  })

  test('direct API: missing password returns 400', async ({ page }) => {
    const r = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'anything' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)
  })

  test('direct API: short password returns 400', async ({ page }) => {
    const r = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'anything', password: 'short' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)
  })

  test('direct API: unknown / forged token returns 401 (NOT 404 — proves route exists)', async ({
    page,
  }) => {
    const r = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'definitely-not-a-real-token-' + Date.now(), password: 'NewPass123!' },
      failOnStatusCode: false,
    })
    // 401 is the molecule handler's "invalid token" path — distinct from 404
    // which would mean the route isn't registered at all.
    expect(r.status()).toBe(401)
    const body = (await r.json()) as { errorKey?: string }
    expect(body.errorKey).toBe('user.error.invalidToken')
  })
})
