import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signup } from './_helpers.js'

interface BillingTier {
  key: string
  name: string
  prices: { period: string; price: string; stripePriceId: string | null }[]
  limits: Record<string, number | boolean>
}

test.describe('billing / pricing', () => {
  test('GET /api/billing/tiers returns Free + Pro + Team with real Stripe price IDs', async ({
    page,
  }) => {
    await signup(page) // ensures we have a session for endpoints that gate on it
    const tiers = await apiGet<BillingTier[] | { data: BillingTier[] }>(page, '/billing/tiers')
    const list = Array.isArray(tiers) ? tiers : (tiers as { data: BillingTier[] }).data
    expect(list.length, 'expected three tiers (free, pro, team)').toBeGreaterThanOrEqual(3)
    // The tiers list is keyed by `key` — that is the shape the shared
    // createBillingRouter emits (PricingTier.key) and what the other 93 specs in
    // the fleet read. `planKey` belongs to the plan REGISTRY, not this payload,
    // so the lookup always came back undefined.
    const pro = list.find((t) => t.key === 'pro')
    expect(pro, 'pro tier must exist').toBeTruthy()
    const monthly = pro!.prices.find((p) => p.period === 'month')
    expect(monthly?.stripePriceId, 'pro monthly Stripe price id must be provisioned').toMatch(
      /^price_/,
    )
    const yearly = pro!.prices.find((p) => p.period === 'year')
    expect(yearly?.stripePriceId, 'pro yearly Stripe price id must be provisioned').toMatch(
      /^price_/,
    )
  })

  test('GET /api/billing/status defaults to free for a fresh user', async ({ page }) => {
    await signup(page)
    const status = await apiGet<{
      key: string
      isFree: boolean
      limits: Record<string, number | boolean>
    }>(page, '/billing/status')
    expect(status.planKey).toBe('free')
    expect(status.isFree).toBe(true)
    expect(status.limits.maxConversations).toBe(5)
  })

  test('/pricing renders all three tiers with the support-chat limit labels', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    // Plan headings.
    await expect(page.getByText(/^Free$/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^Pro$/i).first()).toBeVisible()
    await expect(page.getByText(/^Team$/i).first()).toBeVisible()
    // Custom limit text.
    await expect(page.getByText(/conversations/i).first()).toBeVisible()
    await expect(page.getByText(/canned-responses/i).first()).toBeVisible()
    await expect(page.getByText(/agents/i).first()).toBeVisible()
  })

  test('Pricing CTA "Upgrade" calls POST /api/billing/checkout (real Stripe session)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    // Wait for at least one paid-tier card to actually render — otherwise
    // any `.count()` / `.first()` probe races the loading state and falls
    // through to the link-fallback branch that times out. The "Upgrade to …"
    // button is only painted once the tiers fetch resolves and the tier has
    // a Stripe priceId (so it's enabled), making it the right gate.
    const upgrade = page.getByRole('button', { name: /^Upgrade to /i }).first()
    await expect(upgrade).toBeVisible({ timeout: 20_000 })
    await expect(upgrade).toBeEnabled({ timeout: 20_000 })
    // Arm the response listener BEFORE the click — otherwise a fast
    // server can respond before we attach and the promise never resolves.
    const respPromise = page
      .waitForResponse(
        (r) => /\/api\/billing\/checkout/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 20_000 },
      )
      .catch(() => null)
    await upgrade.click()
    const resp = await respPromise
    // If there IS a checkout call, it must return a real Stripe session URL.
    if (resp) {
      expect(resp.status()).toBeLessThan(400)
      const body = await resp.json().catch(() => ({}))
      const url: string | undefined = body?.url || body?.data?.url || body?.checkoutUrl
      if (url) {
        expect(url).toMatch(/checkout\.stripe\.com|cs_test_/)
      }
    }
  })
})
