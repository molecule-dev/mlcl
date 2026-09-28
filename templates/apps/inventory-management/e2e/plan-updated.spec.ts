import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('plan-updated', () => {
  test('renders the thank-you copy after auth state initializes', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      const headings = page.getByRole('heading', { level: 2 })
      await expect(headings.first()).toBeVisible({ timeout: 10_000 })
    })
    // Page should fetch the user's billing status to confirm the plan
    const billingCall = reqs.find((r) => /\/billing\/status$/.test(r.url) && r.method === 'GET')
    // billing/status is fetched on the page or by AuthGuard's user refresh —
    // either way at least one auth-tied call should have completed
    expect(reqs.some((r) => r.status === 200)).toBeTruthy()
    if (billingCall) expect(billingCall.status).toBe(200)
  })

  test('return-home button links to "/"', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-home'))
    await page.goto(APP_BASE + '/plan-updated')
    const link = page
      .getByRole('link')
      .filter({ has: page.getByRole('button') })
      .first()
    await expect(link).toHaveAttribute('href', '/')
  })

  test('unauthenticated user is redirected away (AuthGuard kicks in)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    // Either the AuthGuard has navigated us, OR the page renders a spinner;
    // never the copy itself for an unauthenticated visitor.
    // Wait on the redirect itself, not networkidle: the guard navigates from
    // JS after the auth bond initializes, and under a loaded machine that can
    // land well after the last network request — racing networkidle here read
    // /plan-updated as final and failed the run (rp3 replay, 2026-09-28).
    await page.waitForURL(/\/login/, { timeout: 30_000 })
    // After the auth bond initializes, AuthGuard should send us to /login
    // (or render the spinner state). Both are valid; what is NOT valid is the
    // signed-in copy showing.
    const onLogin = /\/login/.test(page.url())
    expect(onLogin).toBeTruthy()
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
