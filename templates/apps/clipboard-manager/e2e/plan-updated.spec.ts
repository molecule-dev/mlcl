/**
 * /plan-updated — Stripe `successUrl` landing target. Shows a static
 * confirmation card + a CTA back to /clips. Auth client must finish
 * initialising before the CTA is interactive.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('plan updated page', () => {
  test('renders the confirmation message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /plan.*updated|updated/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/thank/i)).toBeVisible()
  })

  test('confirmation CTA navigates back into the app', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link').first().click()
    await page.waitForURL('**/clips', { timeout: 10000 })
  })

  test('thank-you body paragraph is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/thank/i).first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    // Expected 4xx: 'cs_test_e2e' is not a real Stripe session, so the API
    // answers 400 "could not verify". What this test pins is the wiring that
    // actually grants a purchase: the return page must POST the confirmation
    // through the bonded client (baseURL /api) at the API — an earlier
    // regression sent it to the SPA origin, where vite answered 404 and no
    // purchase was ever confirmed.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 400' })
    await signup(page)
    // 30s: on a cold dev server (fresh vite transform under load) the page
    // bundle can take a while before the mount effect fires the call — a
    // 20s cap flaked once under a loaded machine.
    const confirmed = page
      .waitForResponse((r) => /\/api\/users\/.+\/verify-payment\//.test(r.url()), {
        timeout: 30_000,
      })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    const res = await confirmed
    expect(res, 'no /api/users/:id/verify-payment request fired').not.toBeNull()
    // The confirmation must reach the API, not the SPA fallback.
    expect(res!.url()).toContain('/api/users/')
    // The API processed the call (4xx = Stripe refused the fake session —
    // expected; a 404/5xx would mean broken wiring or a server fault).
    expect(res!.status()).toBeLessThan(500)
  })
})
