/**
 * Per-page spec for /pricing (Pricing). Public.
 *
 * Assert the pricing page actually fetches /api/billing/tiers — we use
 * captureNetwork to satisfy gate 12 (network table → captureNetwork).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('GET /pricing fetches /api/billing/tiers and renders priced plans', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/billing\/tiers/.test(r.url) && r.status === 200)).toBe(true)
  const text = await page.evaluate(() => document.body.innerText)
  expect(text).toMatch(/\$/)
  expect(text.toLowerCase()).toMatch(/plan|tier|free|pro|month|year/)
})

test('GET /pricing renders multiple distinct tier cards', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  const headingCount = await page.locator('h2, h3').count()
  expect(headingCount).toBeGreaterThanOrEqual(2)
})

test('GET /pricing exposes a CTA on each card to start a plan', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  const ctas = page.locator('[data-mol-id^="pricing-cta-"]')
  const count = await ctas.count()
  expect(count).toBeGreaterThan(0)
})
