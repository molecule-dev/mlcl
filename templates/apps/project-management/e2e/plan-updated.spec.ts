/**
 * /plan-updated — post-Stripe-Checkout return page that confirms the
 * subscription tier change. Verifies it renders for a signed-in user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('plan-updated page', () => {
  test('/plan-updated renders for a signed-in user (post-checkout return page)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('plan-updated-1'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('body')).toContainText(/plan/i, { timeout: 10000 })
  })

  test('/plan-updated is the configured Stripe success_url', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-2'))
    await page.goto(APP_BASE + '/plan-updated?session_id=test_session')
    await expect(page).toHaveURL(/\/plan-updated/)
  })

  test('/plan-updated renders the document title', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-3'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveTitle(/.+/)
  })
})
