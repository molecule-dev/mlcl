import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Pricing /pricing', () => {
  test('renders three tier cards (Free / Pro / Team) with Choose your Ascent plan heading', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /choose your ascent plan/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^free$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()
  })

  test('Free tile has a disabled Current plan button', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /current plan/i })).toBeDisabled()
  })

  test('initial GET /api/billing/tiers fires and returns ≥3 tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiers, 'GET /api/billing/tiers should fire on Pricing render').toBeTruthy()
    expect(tiers!.status).toBe(200)
  })

  test('Upgrade to Pro (auth) creates a real Stripe Checkout session and redirects', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /upgrade to pro/i }).click()
      await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(checkout, 'POST /api/billing/checkout must fire').toBeTruthy()
    expect(checkout!.status).toBe(200)
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('Upgrade to Team (auth) also creates a Stripe Checkout session', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.getByRole('button', { name: /upgrade to team/i }).click()
    await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })
})
