import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('shell renders the confirmation page', async ({ page }) => {
    await signup(page, uniqueEmail('pu-shell'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('[data-test=plan-updated-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('"plan updated" heading is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('pu-message'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/plan.*updated/i).first()).toBeVisible()
  })

  test('"Thank you" message is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('pu-thanks'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/thank.*you/i).first()).toBeVisible()
  })

  test('home button navigates to /dashboard', async ({ page }) => {
    await signup(page, uniqueEmail('pu-home'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('[data-test=plan-updated-home]').click()
    await expect(page).toHaveURL(/\/dashboard/)
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
