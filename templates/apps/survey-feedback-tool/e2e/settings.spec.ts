import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('settings (/settings)', () => {
  test('UI: navigating to /settings after signup renders billing settings', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page).toHaveURL(/\/settings$/, { timeout: 15_000 })
      // Wait for billing tiers/status to render
      await expect(
        page.getByRole('heading', { name: /billing|subscription|plan|workspace/i }).first(),
      ).toBeVisible({ timeout: 15_000 })
    })
    // Page must call billing endpoints
    expect(
      reqs.some((r) => r.url.includes('/api/billing/status') && r.status === 200),
      'expected GET /api/billing/status to be exercised',
    ).toBe(true)
    expect(
      reqs.some((r) => r.url.includes('/api/billing/tiers') && r.status === 200),
      'expected GET /api/billing/tiers to be exercised',
    ).toBe(true)
  })

  test('UI: unauthenticated visit to /settings is redirected to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('UI: tier list shows at least one plan option', async ({ page }) => {
    await signup(page)
    // Arm the wait BEFORE the navigation — the tiers fetch can settle while
    // goto is still resolving (create→readback race class).
    const tiersResp = page.waitForResponse(
      (resp) => resp.url().includes('/api/billing/tiers') && resp.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/settings')
    await tiersResp
    // At least one tier card is present. Headings (not getByText) — the app
    // shell's nav carries words like "Profile" that a bare /pro/i text scan
    // would match, including the mobile chip nav hidden on desktop.
    await expect(
      page.getByRole('heading', { name: /free|pro|team|business|starter|growth/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
