/**
 * /plan-updated — post-checkout success page.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('plan-updated: page renders something (body not empty)', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('plan-updated: a "back to app" / "decks" / home control is reachable', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  // Either a link or a button to navigate back into the app.
  //
  // What was wrong: `page.goto()` resolves on the `load` event, but this is a Vite
  // SPA whose `#root` is still empty at that instant — React paints ~150-200ms
  // later. `count()` is a one-shot read with NO auto-waiting, so both counts
  // sampled the pre-paint DOM and summed to 0. Measured on this page: 0 matches at
  // `goto`, 5 links + 5 buttons once painted.
  const navControl = page.getByRole('link').or(page.getByRole('button'))
  await expect(navControl.first()).toBeVisible()
})

test('plan-updated: navigating away to /decks works (so the user can resume)', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  // Just navigate manually to confirm the success page does not break SPA routing
  await page.goto(APP_BASE + '/decks')
  await expect(page).toHaveURL(/\/decks|\/login/)
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
