/**
 * /plan-updated — Stripe success-redirect landing page. Authenticated
 * page shows confirmation copy and a Return Home link.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('plan-updated page renders thank-you copy', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
  })
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: /return home|home/i })).toBeVisible()
  // Page reads back /api/profile/me to show the new plan, not assume it.
  const me = reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me/.test(r.url))
  expect(me?.status, JSON.stringify(reqs)).toBe(200)
})

test('return home link routes to /dashboard', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.getByRole('link', { name: /return home|home/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
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
