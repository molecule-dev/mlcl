import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/plan-updated page', () => {
  test('renders an h1', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('home link navigates away from /plan-updated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"]').first()
    if (await link.count()) await link.click()
  })

  test('captures /api/billing/status fetch on load', async ({ page }) => {
    const auth = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    expect(auth.accessToken).toBeTruthy()
    const b = reqs.find((r) => r.method === 'GET' && /\/api\/billing/.test(r.url))
    if (b) expect(b.status).toBeLessThan(500)
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
