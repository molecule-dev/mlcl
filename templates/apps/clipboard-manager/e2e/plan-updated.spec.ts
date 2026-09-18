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
