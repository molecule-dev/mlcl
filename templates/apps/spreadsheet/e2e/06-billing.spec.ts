import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('billing', () => {
  test('billing page shows real tiers with Stripe price ids', async ({ page }) => {
    await signup(page, uniqueEmail('billing-tiers'), 'TestPass123!')
    await page.goto(APP_BASE + '/billing')

    // The page should list at least Free / Pro / Team tiers.
    await expect(page.getByText(/^Free$/).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^Pro$/).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/^Team$/).first()).toBeVisible({ timeout: 5000 })

    // The price for Pro should not be a hardcoded $0 placeholder.
    await expect(page.getByText(/\$15.*month|\$15\/mo/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking Upgrade on Pro initiates a real Stripe checkout', async ({ page }) => {
    await signup(page, uniqueEmail('billing-checkout'), 'TestPass123!')
    await page.goto(APP_BASE + '/billing')

    // Watch the network for the checkout request body, before the page redirects.
    const checkoutBodyPromise = (async () => {
      const resp = await page.waitForResponse(
        (r) => r.url().includes('/billing/checkout') && r.request().method() === 'POST',
        { timeout: 15000 },
      )
      // Status check is enough — if the redirect tears down the response stream
      // we can still verify status + Stripe redirect via the frame URL below.
      return { status: resp.status() }
    })()

    // Listen for any navigation kicked off by the redirect.
    const framePromise = page.waitForURL(/checkout\.stripe\.com/, { timeout: 20000 })

    const upgradeButtons = page.getByRole('button', { name: /upgrade|subscribe|choose|select/i })
    // The tier cards (and their Upgrade buttons) render only after the async
    // GET /api/billing/tiers resolves — until then the page shows "Loading
    // plans…". Auto-wait for the first Upgrade button to attach before the
    // synchronous .count() snapshot so the count isn't taken mid-fetch.
    await expect(upgradeButtons.first()).toBeVisible({ timeout: 15000 })
    const count = await upgradeButtons.count()
    expect(count).toBeGreaterThan(0)
    let clicked = false
    for (let i = 0; i < count; i++) {
      const btn = upgradeButtons.nth(i)
      if (await btn.isEnabled()) {
        await btn.click()
        clicked = true
        break
      }
    }
    expect(clicked, 'no enabled upgrade button found').toBe(true)

    const body = await checkoutBodyPromise
    expect(body.status).toBe(200)

    await framePromise
    expect(page.url()).toContain('checkout.stripe.com')
  })

  test('backend invariant: GET /billing/tiers returns Free, Pro, Team with Stripe price ids', async () => {
    const ctx = await apiContext()
    const res = await ctx.get('/api/billing/tiers')
    expect(res.status()).toBe(200)
    const json = (await res.json()) as {
      data: Array<{
        key: string
        name: string
        prices: Array<{ stripePriceId: string | null }>
      }>
    }
    expect(json.data.length).toBeGreaterThanOrEqual(3)
    const pro = json.data.find((t) => t.key === 'pro')
    expect(pro).toBeDefined()
    expect(pro!.prices.some((p) => p.stripePriceId?.startsWith('price_'))).toBe(true)
    await ctx.dispose()
  })

  test('backend invariant: POST /billing/checkout returns Stripe checkout url', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-checkout'))
    const tiers = await ctx.get('/api/billing/tiers')
    const tiersJson = (await tiers.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proPriceId = tiersJson.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.stripePriceId)?.stripePriceId
    expect(proPriceId).toBeTruthy()

    const res = await ctx.post('/api/billing/checkout', {
      headers: { Authorization: `Bearer ${me.token}` },
      data: { priceId: proPriceId },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl).toContain('stripe.com')
    await ctx.dispose()
  })
})
