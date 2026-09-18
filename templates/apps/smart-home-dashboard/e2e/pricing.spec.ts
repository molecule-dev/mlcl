import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/pricing', () => {
  test('public /pricing renders the free tier card without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-free"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('public /pricing renders the pro tier card without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('clicking the Pro upgrade CTA POSTs /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle').catch(() => {})
    const proCta = page.locator('[data-mol-id="pricing-cta-pro"]').first()
    await expect(proCta).toBeVisible({ timeout: 10_000 })
    const reqs = await captureNetwork(page, async () => {
      await proCta.click()
      await page.waitForTimeout(3000)
    })
    const posts = whereUrl(reqs, /\/api\/billing\/checkout/, 'POST')
    expect(posts.length, 'POST /api/billing/checkout fired').toBeGreaterThan(0)
    expect(posts[0]!.status, 'checkout accepted').toBeLessThan(300)
  })

  test('"sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const link = page.getByRole('link', { name: /sign in/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
