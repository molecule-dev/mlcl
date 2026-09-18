import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders the pricing page', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('lists three plan tiers (free + pro + team)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/starter|free/)
    expect(body).toMatch(/pro/)
    expect(body).toMatch(/team|scale/)
  })

  test('shows a CTA (link or button) for upgrading or signing up', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    // CTA may be a link (anonymous → /signup) or a button (authed →
    // /api/billing/checkout). Either is acceptable.
    const linkCta = page
      .getByRole('link', { name: /start|sign\s*up|upgrade|talk to sales/i })
      .first()
    const buttonCta = page
      .getByRole('button', { name: /upgrade|start|sign\s*up|talk to sales/i })
      .first()
    const linkVisible = await linkCta.isVisible().catch(() => false)
    const buttonVisible = await buttonCta.isVisible().catch(() => false)
    expect(linkVisible || buttonVisible).toBe(true)
  })

  test('captureNetwork: /pricing optionally fires /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    // Fine if it fires, fine if it doesn't — but if it does, must be 200.
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    if (call) expect(call.status).toBe(200)
  })

  test('upgrade flow: /api/billing/checkout returns a real Stripe Checkout URL', async ({
    page,
  }) => {
    await signup(page)
    // Pick a real, scaffolded Stripe priceId from /api/billing/tiers.
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(page),
    })
    expect(tiersRes.status()).toBe(200)
    const tiers = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')
    const priceId = pro?.prices?.[0]?.stripePriceId
    expect(priceId, 'pro tier must have a stripe priceId').toBeTruthy()
    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(page),
      data: { priceId },
    })
    expect(checkout.status()).toBe(200)
    const body = (await checkout.json()) as { checkoutUrl?: string; url?: string }
    const url = body.checkoutUrl ?? body.url ?? ''
    expect(url).toMatch(/checkout\.stripe\.com|cs_test_/)
  })
})
