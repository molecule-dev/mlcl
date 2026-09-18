/**
 * /pricing — public pricing page (also the upgrade entrypoint).
 *
 * The Stripe billing flow is exercised in detail in billing.spec.ts.
 * This spec covers the page-shape contract: tiers render from the live
 * `/api/billing/tiers` payload, the "Current plan" pill is non-clickable
 * for the user's current tier, and Upgrade buttons go through Stripe.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('pricing — public page', () => {
  test('renders without auth and shows at least three plan cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // Free + Pro + Team is the canonical ladder. Either the cards have
    // explicit Upgrade buttons (free user) or are rendered as feature
    // bullets.
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/\bpro\b/i).first()).toBeVisible()
    await expect(page.getByText(/\bteam\b/i).first()).toBeVisible()
  })

  test('GET /api/billing/tiers returns plan ladder with stripe price ids', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(200)
    type Tier = {
      key: string
      prices?: Array<{ stripePriceId?: string | null }>
      stripePriceId?: string | null
    }
    const raw = (await res.json()) as { data?: Tier[] } | Tier[]
    const tiers: Tier[] = Array.isArray(raw) ? raw : (raw.data ?? [])
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers.length).toBeGreaterThan(2)
    // At least one paid tier must have a real Stripe price id
    // (`price_…`) — that proves the create-stripe-test-products
    // pipeline ran and the env was filled correctly.
    const paid = tiers.flatMap((t) => [
      ...(t.prices?.map((p) => p.stripePriceId) ?? []),
      t.stripePriceId,
    ])
    expect(paid.some((id) => typeof id === 'string' && id.startsWith('price_'))).toBe(true)
  })

  test('signed-in user sees a "Current plan" indicator for free tier', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-current'))
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Current plan/i }).first()).toBeVisible()
  })

  test('clicking Upgrade to Pro sends the user to a real Stripe checkout', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-upgrade-pro'))
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Upgrade to Pro/i })
        .first()
        .click()
      await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    })
    const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(checkout?.status).toBe(200)
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('header brand returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page
      .getByRole('link', { name: /^Herald/ })
      .first()
      .click()
    await page.waitForURL(APP_BASE + '/', { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('Privacy Policy and Terms of Service buttons are present in the footer chrome', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Privacy Policy/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Terms of Service/i }).first()).toBeVisible()
  })

  test('Language picker button is present', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Language/i }).first()).toBeVisible()
  })

  test('user menu opens for signed-in users on /pricing', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-menu'))
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Open user menu/i }).first()).toBeVisible()
  })

  test('Upgrade to Team also mints a real Stripe checkout', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-upgrade-team'))
    await page.goto(APP_BASE + '/pricing')
    await page
      .getByRole('button', { name: /Upgrade to Team/i })
      .first()
      .click()
    await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
  })

  test('About Herald link opens the in-app About page', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const link = page.getByRole('link', { name: /About Herald/i }).first()
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/about')
    // The href alone proved nothing when it pointed off-site; follow it.
    await link.click()
    await page.waitForURL(/\/about$/)
    await expect(page.locator('body')).toContainText(/Herald/i)
  })
})
