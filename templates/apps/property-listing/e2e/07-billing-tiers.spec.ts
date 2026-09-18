import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext } from './_helpers.js'

test.describe('Pricing & billing', () => {
  test('GET /api/billing/tiers returns at least one paid tier', async () => {
    const ctx = await apiContext()
    const resp = await ctx.get(`${API_BASE}/billing/tiers`)
    expect(resp.ok(), `GET /billing/tiers => ${resp.status()}`).toBe(true)
    const body = (await resp.json()) as { data?: unknown[] } | unknown[]
    const tiers = Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    expect(tiers.length, 'expected at least one tier').toBeGreaterThan(0)
    // One of them should have a stripe price entry (Pro / Team) or
    // a price string that isn't `$0`.
    const hasPaid = (
      tiers as Array<{
        prices?: Array<{ price?: string; stripePriceId?: string | null }>
      }>
    ).some((t) =>
      (t.prices ?? []).some(
        (p) => (p.price && p.price !== '$0' && p.price !== '$0/mo') || Boolean(p.stripePriceId),
      ),
    )
    expect(hasPaid, 'expected at least one paid tier in the ladder').toBe(true)
  })

  test('Public /pricing page renders without console errors', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toBeEmpty()
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|aborted|signal aborted|401|403/i.test(e),
    )
    expect(fatal, `unexpected console errors: ${fatal.join(' | ')}`).toEqual([])
  })
})
