/**
 * /plan-updated is the post-Stripe-checkout success landing page. It
 * doesn't kick off any RPCs of its own — it just confirms the user is
 * authenticated and shows a return-home CTA. The actual webhook
 * handling lives in the user-resource payment-notification route
 * exercised in 07-billing.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('/plan-updated requires auth and renders the success copy', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/plan-updated`)
  await expect(page.locator('[data-mol-id="page-plan-updated"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="plan-updated-back"]')).toBeVisible()
})

test('/plan-updated "Return home" navigates to /', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/plan-updated`)
  await page.locator('[data-mol-id="plan-updated-back"]').click()
  await page.waitForURL((u) => u.pathname === '/' || u.pathname === '/dashboard', {
    timeout: 5_000,
  })
})

test('/plan-updated bounces to /login when anonymous', async ({ page }) => {
  await page.goto(`${APP_BASE}/plan-updated`)
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/plan-updated renders a confirmation heading', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/plan-updated`)
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8_000 })
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
