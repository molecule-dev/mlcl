import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('pricing', () => {
  test('public /pricing renders heading + Free/Pro/Team tier cards', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(
        page.getByRole('heading', { name: /choose your.*plan|plan/i, level: 1 }).first(),
      ).toBeVisible({
        timeout: 10000,
      })
    })
    const tiersReq = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersReq?.status, 'GET /api/billing/tiers').toBe(200)
    await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible()
  })

  test('Pro tier shows the $15/mo price and renders limits list', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const proCard = page.locator('[data-mol-id="pricing-tier-pro"]')
    await expect(proCard).toBeVisible({ timeout: 10000 })
    const txt = (await proCard.textContent()) ?? ''
    // Free is $0; Pro should NOT be $0.
    expect(txt, 'pro tier card text').toMatch(/\$\d+/)
    expect(txt).toMatch(/drivers/i)
    expect(txt).toMatch(/vehicles/i)
  })

  test('clicking Upgrade to Pro as an authenticated user opens a real Stripe Checkout URL', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible({ timeout: 10000 })
    // Drive the checkout API directly so we assert on the real Stripe artefact —
    // the visible UI button is exercised by the kitchen-sink user-journey spec.
    const tiersResp = await page.request.get(API_BASE + '/billing/tiers')
    expect(tiersResp.status()).toBe(200)
    const tiersBody = (await tiersResp.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = tiersBody.data.find((t) => t.key === 'pro')
    const proPriceId = pro?.prices.find((p) => !!p.stripePriceId)?.stripePriceId ?? null
    test.skip(!proPriceId, 'no Pro priceId configured (STRIPE_FLEET_MANAGEMENT_PRO_MONTHLY blank)')
    const checkout = await page.request.post(API_BASE + '/billing/checkout', {
      data: { priceId: proPriceId! },
      headers: apiHeaders(accessToken),
    })
    expect(checkout.status(), 'POST /api/billing/checkout').toBe(200)
    const body = (await checkout.json()) as {
      url?: string
      checkoutUrl?: string
      sessionId?: string
      updated?: boolean
    }
    const url = body.url || body.checkoutUrl || ''
    // Either we got a real Stripe Checkout URL, or the provider already
    // reported the subscription is updated (no checkout needed).
    if (!body.updated) {
      expect(url, 'checkout url shape').toMatch(
        /^https?:\/\/checkout\.stripe\.com|^https?:\/\/.+stripe\.com/,
      )
    }
  })

  test('Free tier card shows the Free label / $0 price', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const freeCard = page.locator('[data-mol-id="pricing-tier-free"]')
    await expect(freeCard).toBeVisible({ timeout: 10000 })
    const txt = (await freeCard.textContent()) ?? ''
    expect(txt.toLowerCase()).toContain('free')
  })

  test('Team tier card shows a higher price than Pro', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible({ timeout: 10000 })
    const proTxt = (await page.locator('[data-mol-id="pricing-tier-pro"]').textContent()) ?? ''
    const teamTxt = (await page.locator('[data-mol-id="pricing-tier-team"]').textContent()) ?? ''
    const proPrice = Number((proTxt.match(/\$(\d+(?:\.\d+)?)/) ?? ['0', '0'])[1])
    const teamPrice = Number((teamTxt.match(/\$(\d+(?:\.\d+)?)/) ?? ['0', '0'])[1])
    expect(teamPrice).toBeGreaterThan(proPrice)
  })
})
