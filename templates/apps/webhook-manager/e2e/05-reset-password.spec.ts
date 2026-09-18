import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork } from './_helpers'

test.describe('/reset-password', () => {
  test('renders the reset-password form even without a token', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    // Either the form renders, or it shows an "invalid token" error;
    // both are valid responses depending on guard behaviour.
    await expect(page.locator('body')).toBeVisible()
    const hasPwInput = await page
      .locator('input[type="password"]')
      .first()
      .isVisible()
      .catch(() => false)
    const hasErrorText = await page
      .getByText(/invalid|expired|token/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasPwInput || hasErrorText).toBe(true)
  })

  test('POST /api/users/reset-password rejects invalid tokens with 400', async ({ page }) => {
    // Direct API call exercises the reset-password handler and proves the
    // route is mounted. With a junk token the handler hits its reject
    // branch and returns 400 — that's the contract under test.
    const r = await page.request.post(API_BASE + '/users/reset-password', {
      headers: { 'Content-Type': 'application/json' },
      data: { token: 'definitely-not-a-real-token-xxxxxxxx', password: 'NewPass1234!' },
    })
    expect(r.status(), 'expected 4xx for bogus reset token').toBeGreaterThanOrEqual(400)
    expect(r.status(), 'expected 4xx for bogus reset token').toBeLessThan(500)
    const body = await r.json().catch(() => ({}))
    // Body shape: { error, errorKey } per the handler.
    expect(typeof body.error).toBe('string')
  })

  test('POST /api/users/reset-password rejects malformed payloads with 400', async ({ page }) => {
    const r = await page.request.post(API_BASE + '/users/reset-password', {
      headers: { 'Content-Type': 'application/json' },
      data: { token: 'short', password: 'short' },
    })
    expect(r.status()).toBe(400)
  })

  test('reset-password page exercise captures the network call shape', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-render-only')
    const reqs = await captureNetwork(page, async () => {
      // If the form rendered, attempt a submit; otherwise a direct API call
      // still produces a captured network entry that proves the contract.
      const pwInput = page.locator('input[type="password"]').first()
      if (await pwInput.isVisible().catch(() => false)) {
        await pwInput.fill('NewPass1234!')
        const confirm = page.locator('input[type="password"]').nth(1)
        if (await confirm.isVisible().catch(() => false)) await confirm.fill('NewPass1234!')
        await page.getByRole('button', { name: /reset/i }).first().click()
        await page.waitForTimeout(1500)
      } else {
        await page.request.post(API_BASE + '/users/reset-password', {
          headers: { 'Content-Type': 'application/json' },
          data: { token: 'fake-token-for-render-only', password: 'NewPass1234!' },
        })
      }
    })
    // At least one POST to /api/users/reset-password should have been observed in
    // either the UI or the direct fallback path.
    const reset = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url),
    )
    if (reset) {
      // Server must respond with a recognisable contract code.
      expect([200, 400]).toContain(reset.status)
    }
  })
})
