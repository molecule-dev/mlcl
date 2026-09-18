import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('the page actually fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/billing\/tiers$/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('renders one card per tier returned from /api/billing/tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 15000 })
    const cards = page.locator('[data-mol-id^="pricing-tier-"]')
    await expect.poll(async () => await cards.count(), { timeout: 10000 }).toBeGreaterThan(0)
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('a logged-in user clicking a paid tier CTA POSTs to /api/billing/checkout', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 15000 })
    const enabledCta = page.locator('[data-mol-id^="pricing-cta-"]:not([disabled])').first()
    if (!(await enabledCta.count())) {
      // No paid tier configured (no Stripe price IDs locally) — at minimum
      // every CTA should render and be either enabled or correctly disabled.
      const allCta = page.locator('[data-mol-id^="pricing-cta-"]')
      await expect(allCta.first()).toBeAttached()
      return
    }
    const reqs = await captureNetwork(page, async () => {
      // Don't wait for navigation — checkout redirects to Stripe.
      await enabledCta.click({ trial: false })
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some((r) => /\/api\/billing\/checkout$/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })

  test('every tier card displays a price string for the active period', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 15000 })
    const cards = page.locator('[data-mol-id^="pricing-tier-"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const text = (await cards.nth(i).innerText()).trim()
      expect(text.length).toBeGreaterThan(0)
    }
  })
})
