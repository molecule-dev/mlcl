import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /plan-updated — post-Stripe-checkout success page. Just text + a link
// back to /docs.

test.describe('/plan-updated', () => {
  test('"Your plan has been updated" message visible without 5xx', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.getByText(/Your plan has been updated/i).waitFor({ timeout: 15_000 })
    })
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during /plan-updated render',
    ).toBeUndefined()
  })

  test('Thank you copy visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/Thank you/i)).toBeVisible({ timeout: 15_000 })
  })

  test('Return-home link navigates to /docs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // The button copy is i18n'd ("Return home" / "Return to docs" depending on
    // locale); the link target is always /docs. Match by href to be locale-safe.
    await page
      .locator('a[href="/docs"]')
      .filter({ hasText: /return/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/docs$/)
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
