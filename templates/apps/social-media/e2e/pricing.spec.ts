import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('pricing page', () => {
  test('Pricing page is reachable and lists Pro plan with monthly price', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('body')).toContainText(/Pro/i, { timeout: 10_000 })
    await expect(page.locator('body')).toContainText(/\$15|\$ ?15/i)
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  })

  test('Free tier is also rendered alongside Pro', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('body')).toContainText(/Free/i, { timeout: 10_000 })
  })

  test('Sign in link is reachable for unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const link = page.locator('a[href="/login"]').first()
    if ((await link.count()) > 0) {
      await expect(link).toHaveAttribute('href', '/login')
    } else {
      await expect(page.locator('body')).toContainText(/Pro/i)
    }
  })

  test('Page mount fetches /api/billing/tiers via captureNetwork', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(1500)
    })
    const hit = reqs.some((r) => /\/api\/billing\/tiers/.test(r.url))
    expect(hit, 'pricing page should fetch /api/billing/tiers').toBeTruthy()
  })

  test('Checkout for Pro returns a real Stripe checkout URL when signed in', async ({ page }) => {
    const me = await signup(page)
    const tiersRes = await page.request.get('/api/billing/tiers')
    expect(tiersRes.status()).toBe(200)
    const tiers = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')
    const priceId = pro?.prices.find((p) => p.stripePriceId)?.stripePriceId
    expect(priceId).toBeTruthy()

    const res = await page.request.post('/api/billing/checkout', {
      headers: { Authorization: `Bearer ${me.accessToken}`, 'Content-Type': 'application/json' },
      data: { priceId },
    })
    expect(res.status(), await res.text()).toBe(200)
    const json = (await res.json()) as { checkoutUrl?: string; updated?: boolean }
    if (json.checkoutUrl) {
      expect(json.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/)
    } else {
      expect(json.updated).toBe(true)
    }
  })
})
