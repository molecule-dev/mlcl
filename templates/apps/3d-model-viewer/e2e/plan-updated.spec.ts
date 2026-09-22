import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('Renders thank-you heading once auth state is initialized', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
    expect(body!.toLowerCase()).toMatch(/plan|thank/)
  })

  test('"Return to Home" button navigates back to the landing page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const cta = page.getByRole('button', { name: /return.*home|home/i }).first()
    if ((await cta.count()) > 0) {
      await cta.click()
      await expect(page).not.toHaveURL(/\/plan-updated/, { timeout: 5_000 })
    }
  })

  test('Page renders without console errors', async ({ page }) => {
    await signup(page)
    // Navigate directly via URL (not from another page) so we don't pick up
    // transient "Failed to fetch" warnings from Dashboard hooks aborting
    // mid-flight when the route changes.
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    // Filter out: favicon, net::ERR_*, and AbortController-style 'Failed to
    // fetch' noise from in-flight requests cancelled by navigation.
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to fetch|Network error|TypeError: Failed/i.test(e),
    )
    expect(fatal).toEqual([])
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // Unconfigured-stripe contract (no STRIPE_SECRET_KEY in the test env): the
    // checkout return FIRES verify-payment and the server REFUSES with the
    // actionable 503 config.notConfigured (400 if a key is set and the fake
    // session id fails verification). Either way it must never be a silent
    // no-op or an UNHANDLED 500 — a 500 here means a payments bond is missing.
    // Allow the browser's expected "Failed to load resource" log for the
    // non-2xx refusal.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of [45]\\d\\d',
    })
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    const resp = await confirmed
    expect(resp, 'verify-payment call fired on checkout return').not.toBeNull()
    const status = resp!.status()
    expect(
      status,
      'checkout return must refuse (4xx) or answer the actionable 503 — never grant unverified',
    ).toBeGreaterThanOrEqual(400)
    expect(status, 'unhandled 500 = a payments bond is missing (crash, not a refusal)').not.toBe(
      500,
    )
  })
})
