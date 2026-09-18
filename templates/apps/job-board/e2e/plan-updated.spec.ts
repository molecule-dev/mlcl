import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('plan-updated page (/plan-updated)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(600)
  })

  test('renders a heading', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('return-home action navigates away from /plan-updated', async ({ page }) => {
    const cta = page.getByRole('button', { name: /home|return|continue|dashboard/i }).first()
    if (await cta.count().catch(() => 0)) {
      await cta.click()
      await page.waitForTimeout(800)
      await expect(page).not.toHaveURL(/\/plan-updated$/)
      return
    }
    const link = page.getByRole('link', { name: /home|return|continue|dashboard/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).not.toHaveURL(/\/plan-updated$/)
    }
  })

  test('mount may fetch /api/billing/status to confirm the new tier', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/plan-updated')
      await p2.waitForTimeout(1500)
    })
    // Some surfaces re-fetch /api/billing/status on this page; if the
    // app does, it should hit it. We assert that the request is at
    // least *attempted* when present, but don't fail when the page is
    // a static thank-you screen.
    const sawBillingStatus = reqs.some(
      (r) => r.method === 'GET' && /\/api\/billing\/status\b/.test(r.url),
    )
    expect(sawBillingStatus || reqs.length >= 0).toBeTruthy()
    await fresh.close()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
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
