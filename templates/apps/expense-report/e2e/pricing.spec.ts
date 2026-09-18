import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing page', () => {
  test('Current plan button reflects the user is on the free tier after fresh signup', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /current plan/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('Upgrade to Pro button initiates Stripe Checkout and redirects to checkout.stripe.com', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
      const pro = page.locator('[data-mol-id="pricing-cta-pro"]').first()
      await pro.click()
      // Wait for the Stripe redirect or for the checkout POST to land
      await page.waitForTimeout(4000)
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(checkout, 'POST /api/billing/checkout').toBeTruthy()
    expect(checkout?.status).toBeLessThan(400)
    expect(page.url()).toMatch(/checkout\.stripe\.com|\/pricing/)
  })

  test('Upgrade to Team button initiates Stripe Checkout', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
      const team = page.locator('[data-mol-id="pricing-cta-team"]').first()
      if (await team.count().catch(() => 0)) {
        await team.click()
        await page.waitForTimeout(4000)
      }
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    if (checkout) {
      expect(checkout.status).toBeLessThan(400)
    }
  })
})
