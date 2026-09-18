/**
 * /billing — pricing tiers + current-plan summary + Stripe checkout.
 * GET /api/billing/tiers + /api/billing/status drive the UI; clicking a
 * paid tier POSTs /api/billing/checkout and follows the returned URL
 * to a real Stripe `cs_test_...` checkout session.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('billing page', () => {
  test('renders the three tier cards (free, pro, team)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.locator('[data-mol-id="tier-free"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-mol-id="tier-pro"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="tier-team"]')).toBeVisible()
  })

  test('first paint fetches /api/billing/tiers + /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await page.waitForLoadState('networkidle')
    })
    const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.status === 200)
    const status = reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.status === 200)
    expect(tiers, JSON.stringify(reqs.filter((r) => /billing/.test(r.url)))).toBeTruthy()
    expect(status).toBeTruthy()
  })

  test('current plan summary defaults to "Free"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.locator('[data-mol-id="billing-current-plan"]')).toContainText(/free/i, {
      timeout: 15000,
    })
  })

  test('"Most popular" badge is on the Pro tier', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    const proCard = page.locator('[data-mol-id="tier-pro"]')
    await expect(proCard.getByText(/most popular/i)).toBeVisible({ timeout: 15000 })
  })

  test('current tier card shows "Current plan" + disabled CTA', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    const freeCta = page.locator('[data-mol-id="tier-free-cta"]')
    await expect(freeCta).toContainText(/current plan/i, { timeout: 15000 })
    await expect(freeCta).toBeDisabled()
  })

  test('Pro CTA POSTs checkout and receives a Stripe checkout URL', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const body = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null; period: string }> }>
    }
    const pro = body.data.find((t) => t.key === 'pro')
    const monthly = pro?.prices.find((p) => p.period === 'month')
    expect(monthly?.stripePriceId).toMatch(/^price_/)
    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      data: { priceId: monthly?.stripePriceId },
      failOnStatusCode: false,
    })
    expect(checkout.status()).toBe(200)
    const json = (await checkout.json()) as { checkoutUrl?: string }
    expect(json.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\/.*cs_test_/)
  })

  test('period toggle Monthly ↔ Yearly switches displayed prices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.locator('[data-mol-id="period-month"]').click()
    const monthlyText = await page.locator('[data-mol-id="tier-pro"]').textContent()
    await page.locator('[data-mol-id="period-year"]').click()
    const yearlyText = await page.locator('[data-mol-id="tier-pro"]').textContent()
    expect(monthlyText).not.toBe(yearlyText)
  })
})
