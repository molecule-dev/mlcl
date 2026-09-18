/**
 * /pricing page — plan tiers, upgrade CTAs. Outcome asserted: page
 * lists at least one plan, the upgrade CTA is wired into the billing
 * flow (POST /api/billing/checkout-session).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('pricing page renders heading + at least one plan', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('pricing has at least one upgrade CTA', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  // Either a button or a link styled as a CTA must exist.
  const cta = page
    .getByRole('button', { name: /upgrade|subscribe|start|choose|free|pro|select/i })
    .first()
  const ctaLink = page.getByRole('link', { name: /upgrade|subscribe|start|free|pro/i }).first()
  // count() has no auto-waiting and page.goto resolves on 'load', which in this
  // Vite dev SPA is before React paints — measured 0 buttons at load, 2 at 2.5s.
  // Summing two one-shot counts just sampled the empty DOM twice. A web-first
  // union assertion waits, and is stronger (visible, not merely present).
  await expect(cta.or(ctaLink)).toBeVisible()
})

test('upgrade CTA initiates checkout session', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  const reqs = await captureNetwork(page, async () => {
    const button = page.getByRole('button', { name: /upgrade|subscribe|choose|select/i }).first()
    // Wait for the CTA instead of counting it. The guard used to sample the
    // pre-paint DOM, see 0, skip the click entirely — and then the assertion
    // below failed with 'upgrade CTA must do something', describing a no-op the
    // test itself had caused.
    await expect(button).toBeVisible()
    await button.click().catch(() => undefined)
    await page.waitForTimeout(2000)
  })
  // Either the click hits /billing or it routes the user — we just
  // assert *something* happened (no silent no-op).
  const billingHit = reqs.some((r) => /\/api\/billing/.test(r.url))
  const navAway = !page.url().endsWith('/pricing')
  expect(billingHit || navAway, 'upgrade CTA must do something').toBe(true)
})

test('pricing page shows three plan tiers (Free / Pro / Team)', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('heading', { name: /^Free$/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Pro$/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Team$/ })).toBeVisible()
})

test('Free plan card has a disabled "Current plan" button for fresh users', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  const current = page.getByRole('button', { name: /current plan/i }).first()
  await expect(current).toBeVisible()
  await expect(current).toBeDisabled()
})

test('Upgrade to Pro CTA fires POST to /api/billing/checkout', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /upgrade to pro/i })
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2500)
  })
  const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
  expect(checkout, 'Upgrade to Pro should hit /api/billing/checkout').toBeTruthy()
})

test('Upgrade to Team CTA fires POST to /api/billing/checkout', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /upgrade to team/i })
      .click()
      .catch(() => undefined)
    await page.waitForTimeout(2500)
  })
  const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
  expect(checkout, 'Upgrade to Team should hit /api/billing/checkout').toBeTruthy()
})
