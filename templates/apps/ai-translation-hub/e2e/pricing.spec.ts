import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing: public tier comparison', () => {
  test('GET /api/billing/tiers fires on mount and tier cards render', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      // Arm BEFORE navigation — /pricing mounts + fetches fast enough to
      // finish between goto's load event and a post-goto listener attach.
      await Promise.all([
        page.waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200, {
          timeout: 15_000,
        }),
        page.goto(APP_BASE + '/pricing'),
      ])
    })
    expect(
      reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET'),
    ).toBeDefined()
    // The component renders one card per tier; assert the heading is visible.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const cards = page.locator('[data-mol-id^="pricing-tier-"]')
    await expect.poll(async () => cards.count(), { timeout: 10_000 }).toBeGreaterThan(0)
  })

  test('public access — no auth required to load /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    expect(page.url()).toContain('/pricing')
  })

  test('Pro tier card surfaces a CTA button', async ({ page }) => {
    await Promise.all([
      page.waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200, {
        timeout: 15_000,
      }),
      page.goto(APP_BASE + '/pricing'),
    ])
    const proCta = page.locator('[data-mol-id="pricing-cta-pro"]').first()
    await expect(proCta).toBeVisible({ timeout: 10_000 })
    // CTA text mentions Pro (translation default 'Upgrade to Pro').
    const text = (await proCta.textContent()) ?? ''
    expect(text.toLowerCase()).toMatch(/pro|upgrade|current/)
  })
})
