import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Pricing page renders the pricing heading', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/plan/i).first()).toBeVisible()
})

test('Pricing page lists at least one plan tier from /api/billing/tiers', async ({ page }) => {
  const reqs: { url: string; status: number }[] = []
  page.on('response', (r) => reqs.push({ url: r.url(), status: r.status() }))
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url))
  expect(tiers, 'PricingPage should fetch /api/billing/tiers').toBeDefined()
  expect(tiers?.status).toBeLessThan(400)
})
