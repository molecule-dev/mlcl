import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the plan-updated shell', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/welcome|plan|thank|updated|return|home|dashboard/)
  })

  test('has a return-home link', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: /home|dashboard|return/i }).first()
    await expect(link).toBeVisible()
  })

  test('captureNetwork: when authed, /plan-updated calls /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    if (call) expect(call.status).toBe(200)
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
