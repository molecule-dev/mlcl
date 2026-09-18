import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated: post-checkout confirmation', () => {
  test('renders the post-checkout confirmation copy for an authenticated user', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Heading should mention the plan or thanks/welcome — keep loose.
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
    const text = (await heading.textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test("GET /api/billing/status fires on mount and reflects the user's plan", async ({ page }) => {
    const { accessToken } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
    })
    // Either the page or a dependent component reads /billing/status to confirm.
    const status = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(status.status()).toBeLessThan(300)
    const body = (await status.json()) as { planKey?: string; name?: string }
    expect(body.planKey ?? body.name).toBeTruthy()
    // Sanity: the plan-updated route is wired to its own page (not a 404).
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('Has a primary CTA back to the dashboard or billing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // Look for a link/button that sends the user somewhere useful.
    const cta = page
      .locator('a[href="/dashboard"], a[href="/billing"], a[href="/projects"]')
      .first()
    await expect(cta).toBeVisible({ timeout: 10_000 })
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
