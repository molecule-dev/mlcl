/**
 * /pricing — public tier list rendered from /api/billing/tiers. Verifies
 * the page calls the correct API, renders all configured tiers, and the
 * Upgrade-to-Pro CTA is enabled (proves a real stripePriceId is wired).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('/pricing fetches /api/billing/tiers and renders tier cards', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/pricing`)
    await expect(page.getByRole('heading', { name: /Free|Pro|Team/i }).first()).toBeVisible()
  })
  const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
  expect(tiers?.status).toBe(200)
})

test('/pricing renders three tier cards: Free, Pro, Team', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  for (const name of ['Free', 'Pro', 'Team']) {
    await expect(page.getByRole('heading', { name }).first()).toBeVisible()
  }
})

test('/pricing Upgrade-to-Pro button is enabled (price is wired)', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  const upgrade = page.getByRole('button', { name: /Upgrade to Pro/i }).first()
  await expect(upgrade).toBeVisible()
  await expect(upgrade).toBeEnabled()
})

test('/pricing CTA on the free tier is disabled (no stripePriceId)', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  const free = page.locator('[data-mol-id="pricing-cta-free"]').first()
  await expect(free).toBeVisible()
  await expect(free).toBeDisabled()
})

test('/pricing renders the page-level container with all 3 tier articles', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  await expect(page.locator('[data-mol-id="pricing-page"]').first()).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-mol-id="pricing-tier-free"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="pricing-tier-pro"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="pricing-tier-team"]').first()).toBeVisible()
})

test('/pricing pro CTA is wired to a real stripePriceId (not disabled)', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  const proCta = page.locator('[data-mol-id="pricing-cta-pro"]').first()
  await expect(proCta).toBeVisible({ timeout: 10_000 })
  await expect(proCta).toBeEnabled()
})

test('/pricing team CTA is wired to a real stripePriceId (not disabled)', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  const teamCta = page.locator('[data-mol-id="pricing-cta-team"]').first()
  await expect(teamCta).toBeVisible({ timeout: 10_000 })
  await expect(teamCta).toBeEnabled()
})

test('/pricing anonymous Pro CTA click routes to /login (auth gate)', async ({ page }) => {
  await page.goto(`${APP_BASE}/pricing`)
  await page.locator('[data-mol-id="pricing-cta-pro"]').first().click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
})
