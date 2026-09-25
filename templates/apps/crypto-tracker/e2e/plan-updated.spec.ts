/**
 * /plan-updated — the page a hosted checkout returns the buyer to. It has to
 * confirm the purchase from the app origin, where the session cookie applies.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    // The QA Stripe test account has no `cs_test_e2e` checkout session, so the
    // verify POST answering 400 (and the browser console error that logs) IS the
    // expected outcome here — this spec asserts the call fires from the app
    // origin, not that Stripe grants a plan. Allow that one error so the
    // console-guard's teardown race cannot flake the run.
    test.info().annotations.push({ type: 'allow-console-error', description: 'verify-payment' })
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
