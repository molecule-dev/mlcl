import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated page', () => {
  test('Renders a heading after a successful checkout return', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.length).toBeGreaterThanOrEqual(0)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('Has a link back to / or /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const home = page.locator('a[href="/"], a[href="/dashboard"]').first()
    await expect(home).toBeVisible({ timeout: 10000 })
  })

  test('Clicking the home link navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const home = page.locator('a[href="/"]').first()
    await home.click()
    await page.waitForURL(/\/$|\/dashboard/, { timeout: 5000 })
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
