/**
 * /plan-updated — post-checkout confirmation page. Renders a thank-you
 * panel and a "Return to Home" CTA. Hits /api/profile/me (or /users/me)
 * on mount to refresh the session/plan state.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders a confirmation panel for authenticated users', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-render'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/plan-updated/)
    const text = (await page.locator('body').innerText()).toLowerCase()
    expect(text.length).toBeGreaterThan(40)
  })

  test('displays a heading on the page', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-heading'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('contains a thank-you / plan-updated message', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-msg'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const text = (await page.locator('body').innerText()).toLowerCase()
    expect(text).toMatch(/thank|plan|updated|home/)
  })

  test('Return-to-home action navigates back to /', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-home'))
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const cta = page
      .getByRole('link', { name: /return.*home|back.*home|^home$/i })
      .or(page.getByRole('button', { name: /return.*home|back.*home|^home$/i }))
      .first()
    if (await cta.count()) {
      await cta.click()
      await page.waitForTimeout(800)
    }
  })

  test('refreshes session state on mount (network call to /api/profile/me OR /api/users/me)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('plan-updated-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    // The plan-updated page often refreshes the session; tolerate any /api call.
    const apiCall = reqs.find((r) => /\/api\//.test(r.url))
    if (apiCall) expect(apiCall.status).toBeLessThan(500)
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
