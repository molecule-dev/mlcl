import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

// /plan-updated — the page Stripe redirects to after a successful
// subscription change. Renders confirmation copy and offers a CTA back
// to /vaults.

test.describe('/plan-updated', () => {
  test('renders without auth and shows confirmation copy', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/plan-updated/)
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/plan|subscription|updated|thank/i)
  })

  test('CTA navigates back to /vaults when authed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(800)
    const link = page.locator('a[href="/vaults"]').first()
    await expect(link).toBeVisible()
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
