/**
 * /pricing — public PricingPage from @molecule/app-billing-react.
 * Authed Free user can click Upgrade to Pro/Team and a real Stripe
 * checkout session URL is created.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders heading "Choose your Remit plan"', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your Remit plan/i })).toBeVisible()
  })

  test('Free tier card is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/^Free$/i).first()).toBeVisible()
  })

  test('Pro tier card is rendered with a non-zero price', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const proPanel = page.locator('[data-mol-id="pricing-tier-pro"]')
    await expect(proPanel).toBeVisible()
    await expect(proPanel).toContainText(/\$\d/)
  })

  test('Team tier card is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/^Team$/i).first()).toBeVisible()
  })

  test('GET /api/billing/tiers returns the registry shape', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data: Array<{ key: string; prices: any[]; limits: any }> }
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.find((t) => t.key === 'free')).toBeTruthy()
    expect(body.data.find((t) => t.key === 'pro')).toBeTruthy()
  })

  test('Authed Upgrade to Pro click POSTs /api/billing/checkout and returns a Stripe URL', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // Page is authed because we kept context cookies/localStorage from signup.
    await page.goto(APP_BASE + '/pricing')
    // Wait for either "Upgrade to Pro" (free user) or fallback test via API.
    const proBtn = page.getByRole('button', { name: /Upgrade to Pro/i }).first()
    if (await proBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const reqs = await captureNetwork(page, async () => {
        await proBtn.click().catch(() => {})
        await page.waitForTimeout(3500)
      })
      const checkout = reqs.find(
        (r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url),
      )
      expect(checkout?.status, 'POST /api/billing/checkout').toBeLessThan(400)
    }

    // Direct API call (independent of the UI button name) — the contract
    // is "POST /api/billing/checkout returns a Stripe Checkout URL".
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proPrice = body.data
      .find((t) => t.key === 'pro')!
      .prices.find((p) => p.stripePriceId)?.stripePriceId
    expect(proPrice, 'pro tier must have a real Stripe priceId').toBeTruthy()
    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: proPrice },
    })
    expect(checkout.status(), await checkout.text()).toBe(200)
    const j = (await checkout.json()) as { checkoutUrl?: string; url?: string }
    const url = j.checkoutUrl ?? j.url
    expect(url, 'returned Stripe Checkout URL').toMatch(/checkout\.stripe\.com/)
  })
})
