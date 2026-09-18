/**
 * /plan-updated: confirmation page shown after a successful Stripe
 * checkout. Renders three pieces of fixed copy + a Return-home button.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('confirmation message renders', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByText(/Your plan has been updated/i)).toBeVisible()
})

test('thank-you message renders', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByText(/Thank you/i)).toBeVisible()
})

test('Return home button navigates back to /', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.getByRole('button', { name: /Return home/i }).click()
  await expect(page).toHaveURL(/\/(search)?$/)
})

test('html root document is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.locator('html')).toBeVisible()
})

test('at least one heading is rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  expect(await page.getByRole('heading').count()).toBeGreaterThanOrEqual(1)
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
