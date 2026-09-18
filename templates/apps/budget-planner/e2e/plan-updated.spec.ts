import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('Plan-updated page shows the success message + Return home button', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  // The return-home CTA is a routing <Link> (anchor), not a <button>: it
  // navigates rather than triggering an action.
  await expect(page.getByRole('link', { name: /return home/i })).toBeVisible()
})

test('Return home button routes back to /', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page
    .getByRole('link')
    .filter({ hasText: /return home/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/(dashboard|$|\?)/)
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
