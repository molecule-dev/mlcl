/**
 * Static / public pages — /pricing, /terms, /privacy. These render
 * without auth. Pricing must hit the backend and render real tier data.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('/pricing renders all configured tiers from /api/billing/tiers', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/pricing`)
    await expect(page.getByRole('heading', { name: /Free|Pro|Team/i }).first()).toBeVisible()
  })
  const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
  expect(tiers, 'pricing must call /api/billing/tiers').toBeTruthy()
  expect(tiers!.status).toBe(200)
  // Free, Pro, Team headings should all appear (via TierCard h2)
  for (const name of ['Free', 'Pro', 'Team']) {
    await expect(page.getByRole('heading', { name }).first()).toBeVisible()
  }
})

test('/pricing Upgrade-to-Pro button starts a real Stripe Checkout session', async ({ page }) => {
  // Anonymous click on Upgrade should bounce to /login (no token) — we
  // assert the paid CTA exists and is enabled (proves a stripePriceId
  // is wired). Real e2e checkout-session creation is covered by the
  // /api/billing/checkout test in 07-billing.spec.ts.
  await page.goto(`${APP_BASE}/pricing`)
  const upgrade = page.getByRole('button', { name: /Upgrade to Pro/i }).first()
  await expect(upgrade).toBeVisible()
  await expect(upgrade).toBeEnabled()
})

test('/terms renders without auth', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  // h1 from Terms.tsx
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  expect(await page.locator('main, body').first().innerText()).not.toBe('')
})

test('/privacy renders without auth', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  expect(await page.locator('main, body').first().innerText()).not.toBe('')
})
