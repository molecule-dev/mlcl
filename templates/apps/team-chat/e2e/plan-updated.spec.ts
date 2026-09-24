/**
 * /plan-updated — Stripe successUrl landing page. The page is reached
 * after a successful checkout; we don't drive Stripe in tests, just
 * verify the landing copy and the "Return home" link.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignupAndPrime, uniqueEmail } from './_helpers.js'

test.describe('plan-updated page', () => {
  test.beforeEach(async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('planup'))
  })

  test('renders the "plan has been updated" heading', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /plan has been updated/i })).toBeVisible()
  })

  test('renders a thank-you secondary heading', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible()
  })

  test('"Return home" link points to /', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /return home/i }).first()
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/')
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    // The fake checkout session id makes the verify call land on the API's 404
    // path on some runs (the hook surfaces its "could not confirm yet" state);
    // this test only asserts the call was MADE. The browser logs that 404 as a
    // console error — allow exactly that, nothing broader.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404.*verify-payment',
    })
    await apiSignupAndPrime(page, uniqueEmail('planup'))
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
