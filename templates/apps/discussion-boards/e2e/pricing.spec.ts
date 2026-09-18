import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('Heading renders without raw {{app}} placeholder', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
    const headingText = await heading.innerText()
    expect(headingText).not.toMatch(/\{\{/)
  })

  test('At least one tier name is rendered (free / starter / pro / team)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free|starter|pro|team/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Tier feature lines mention "categories"', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/categories/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Tier feature lines mention "posts"', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/posts/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('Tier feature lines mention "topics"', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/topics/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('GET /api/billing/tiers returns a non-empty array of tiers (real Stripe-driven data)', async ({
    page,
  }) => {
    const res = await page.request.get(API_BASE + '/billing/tiers')
    expect(res.status()).toBe(200)
    const body = await res.json()
    const tiers = body.data ?? body.tiers ?? body
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers.length).toBeGreaterThan(0)
  })

  test('Authenticated upgrade fires a real Stripe Checkout session (cs_test_...)', async ({
    page,
  }) => {
    await signup(page)
    // tiersFirst — find a non-free priceId from the tiers endpoint
    const tiersResp = await page.request.get(API_BASE + '/billing/tiers')
    expect(tiersResp.status()).toBe(200)
    const tiersBody = await tiersResp.json()
    const tiers: Array<{
      key?: string
      id?: string
      name?: string
      priceId?: string
      prices?: Array<{
        id?: string
        priceId?: string
        stripePriceId?: string
        interval?: string
        period?: string
      }>
    }> = tiersBody.data ?? tiersBody.tiers ?? tiersBody
    type Tier = {
      key?: string
      id?: string
      name?: string
      priceId?: string
      prices?: Array<{
        id?: string
        priceId?: string
        stripePriceId?: string
        interval?: string
        period?: string
      }>
    }
    let priceId: string | null = null
    for (const tier of tiers as Tier[]) {
      // skip free
      if (
        /free/i.test(tier.name ?? '') ||
        /free/i.test(tier.key ?? '') ||
        /free/i.test(tier.id ?? '')
      )
        continue
      if (tier.priceId) {
        priceId = tier.priceId
        break
      }
      if (tier.prices && tier.prices.length) {
        // discussion-boards tiers expose prices as { period: 'month' | 'year', stripePriceId }
        const monthly =
          tier.prices.find((p) => p.interval === 'month' || p.period === 'month') ?? tier.prices[0]
        priceId = monthly?.stripePriceId ?? monthly?.priceId ?? monthly?.id ?? null
        if (priceId) break
      }
    }
    expect(
      priceId,
      'paid tier must expose a Stripe priceId — Stripe products must be provisioned',
    ).toBeTruthy()

    const post = await page.request.post(API_BASE + '/billing/checkout', {
      data: { priceId, successUrl: APP_BASE + '/plan-updated', cancelUrl: APP_BASE + '/pricing' },
    })
    expect(post.status()).toBeLessThan(400)
    const body = await post.json()
    // The route returns { checkoutUrl } for new subscriptions; older shapes
    // used { url } / { data: { url } }. Accept all three so the spec is
    // robust to the canonical contract.
    const url = body.checkoutUrl ?? body.url ?? body.data?.url
    expect(url, 'checkout response must contain a real Stripe URL').toBeTruthy()
    expect(url).toMatch(/checkout\.stripe\.com|stripe\.com\/c\/pay\/cs_test_/)
  })
})
