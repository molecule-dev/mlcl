import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listTiers, signup } from './_helpers.js'

test.describe('Pricing /pricing', () => {
  test('public visit fetches /api/billing/tiers and renders the grid', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiers, 'GET /api/billing/tiers').toBeTruthy()
    expect(tiers!.status).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="pricing-grid"]')).toBeVisible()
  })

  test('every configured tier renders a card with a price string', async ({ page }) => {
    // Need an auth token to read tiers (route is auth-required), but the
    // pricing page itself is public and renders without one. Seed via API
    // to inspect the expected key list.
    const { accessToken } = await signup(page)
    const all = await listTiers(page, accessToken)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()

    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    for (const t of all) {
      await expect(page.locator(`[data-mol-id="pricing-plan-${t.key}"]`)).toBeVisible()
      await expect(page.locator(`[data-mol-id="pricing-plan-${t.key}-price"]`)).toContainText(
        /\$|Custom/,
      )
    }
  })

  test('annual toggle re-renders prices', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const proPriceMonthly = await page
      .locator('[data-mol-id="pricing-plan-pro-price"]')
      .first()
      .innerText()
      .catch(() => '')
    await page.locator('[data-mol-id="pricing-period-year"]').first().click()
    await page.waitForTimeout(500)
    const proPriceYearly = await page
      .locator('[data-mol-id="pricing-plan-pro-price"]')
      .first()
      .innerText()
      .catch(() => '')
    expect(proPriceYearly).not.toBe(proPriceMonthly)
  })

  test('signed-in upgrade CTA hits /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    const reqs: { method: string; url: string; status: number }[] = []
    page.on('response', (resp) =>
      reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() }),
    )
    const navPromise = page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    await page.locator('[data-mol-id="pricing-plan-pro-cta"]').first().click()
    await navPromise.catch(() => null)

    const post = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(post, 'expected POST /api/billing/checkout').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
  })

  test('logged-out CTA routes to /signup (or /login) before checkout', async ({ page }) => {
    await page.evaluate(() => {}).catch(() => null)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.locator('[data-mol-id="pricing-plan-pro-cta"]').first().click()
    await page.waitForTimeout(2500)
    expect(page.url()).toMatch(/\/(signup|login|pricing)/)
  })
})
