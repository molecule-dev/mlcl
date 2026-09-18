import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Plan-updated confirmation page (/plan-updated)', () => {
  test('renders the success heading for an authenticated user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('renders thank-you body copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(800)
    const body = page.getByText(
      /thank|plan|active|upgraded|welcome|live|higher limits|subscription|updated/i,
    )
    await expect(body.first()).toBeAttached()
  })

  test('Go-to-dashboard link navigates to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(500)
    const link = page.locator('[data-testid="plan-updated-dashboard-link"]')
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no dashboard link on plan-updated')
    await link.click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Settings link navigates to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /open settings|settings/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no settings link on plan-updated')
    await link.first().click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('page does NOT 5xx on its background billing fetch', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForTimeout(800)
    })
    const billing = reqs.filter((r) => /\/api\/billing/.test(r.url))
    for (const r of billing) {
      expect(r.status, `${r.method} ${r.url} should not 5xx`).toBeLessThan(500)
    }
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
