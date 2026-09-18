/**
 * /pricing — public pricing page driven by /api/billing/tiers. Asserts
 * that recognizable plan tiers render, the limits list is non-empty,
 * and (when authenticated) clicking Upgrade returns a real Stripe
 * checkout.session URL.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders the page heading', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('lists multiple recognizable tier names', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const text = (await page.locator('body').innerText()).toLowerCase()
    const hits = ['free', 'pro', 'enterprise', 'team', 'business'].filter((kw) => text.includes(kw))
    expect(hits.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /api/billing/tiers fires on load (network)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(r, '/pricing must fetch /api/billing/tiers').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('each tier card lists per-plan limits', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    // Limits include "posts", "comments / day", "MB upload", "custom tags"
    const text = (await page.locator('body').innerText()).toLowerCase()
    expect(text).toMatch(/posts/)
    expect(text).toMatch(/comments/)
  })

  test('Pro tier card lists key feature flags (AI / scheduling / etc.)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const text = (await page.locator('body').innerText()).toLowerCase()
    expect(text).toMatch(/schedule|ai|analytics|export/)
  })

  test('upgrade CTA returns a real checkout.session URL when authed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pricing-checkout'))
    // Look up a non-free tier price id from the backend.
    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(tiers.status()).toBeLessThan(400)
    const tiersBody = (await tiers.json()) as
      | { data?: Array<{ key: string; prices?: Array<{ stripePriceId?: string | null }> }> }
      | Array<{ key: string; prices?: Array<{ stripePriceId?: string | null }> }>
    const list = Array.isArray(tiersBody) ? tiersBody : (tiersBody.data ?? [])
    let foundPriceId: string | null = null
    for (const tier of list) {
      for (const price of tier.prices ?? []) {
        if (price.stripePriceId) {
          foundPriceId = price.stripePriceId
          break
        }
      }
      if (foundPriceId) break
    }
    if (!foundPriceId) {
      test.skip(true, 'no paid tier configured (Stripe price ids missing)')
    }
    const cs = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId: foundPriceId },
      failOnStatusCode: false,
    })
    if (cs.status() === 503) {
      test.skip(true, 'billing provider unavailable in this smoke env')
    }
    expect(cs.status()).toBeLessThan(400)
    const body = (await cs.json()) as { checkoutUrl?: string; url?: string }
    const url = body.checkoutUrl ?? body.url
    expect(url).toBeTruthy()
    expect(url).toMatch(/checkout\.stripe\.com/)
  })

  test('anonymous load does not error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('Free tier is rendered as a recognized card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const text = (await page.locator('body').innerText()).toLowerCase()
    expect(text).toContain('free')
  })

  test('a pricing-related button (Upgrade/Get/Subscribe) is rendered for paid tiers', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const btns = page.getByRole('button', {
      name: /upgrade|get pro|get team|subscribe|choose|select/i,
    })
    await expect(btns.first()).toBeAttached()
  })
})
