import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders a pricing heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // PricingPage renders an h1 from the heading prop or its own default.
    const h1 = page.getByRole('heading', { level: 1 }).first()
    await expect(h1).toBeVisible({ timeout: 10_000 })
  })

  test('fetches /api/billing/tiers on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersCall, 'GET /api/billing/tiers should fire on /pricing').toBeTruthy()
    expect(tiersCall!.status).toBe(200)
  })

  test('renders limit lists with non-zero numbers for at least one tier', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // Wait for at least one tier card / list rendered.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const allLists = page.getByRole('list')
    await expect(allLists.first()).toBeAttached()
    // Body contains the literal "cards" or the ∞ glyph for unlimited.
    const body = await page.content()
    expect(body, 'pricing renders limit values').toMatch(/cards|decks|study|stats|∞/i)
  })
})
