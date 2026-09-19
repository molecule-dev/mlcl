import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing (Pricing)', () => {
  test('Three tier cards render after /api/billing/tiers loads', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(800)
    })
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersCall, 'GET /api/billing/tiers fired').toBeTruthy()
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/family/i).first()).toBeVisible()
  })

  test('Upgrade to Pro creates a real Stripe Checkout session', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    const upgrade = page.getByRole('button', { name: /upgrade to pro/i }).first()
    await expect(upgrade).toBeVisible({ timeout: 8_000 })
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/billing/checkout'), {
      timeout: 12_000,
    })
    await upgrade.click()
    const resp = await respPromise
    expect(resp.status()).toBe(200)
    await page.waitForTimeout(3500)
    expect(page.url(), 'page must navigate to a real Stripe Checkout URL').toMatch(
      /checkout\.stripe\.com\/.*cs_test_/,
    )
  })

  test('Free tier card lists the configured limits', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    await expect(page.getByText(/personal recipes/i).first()).toBeVisible()
    await expect(page.getByText(/custom foods/i).first()).toBeVisible()
    await expect(page.getByText(/saved meals/i).first()).toBeVisible()
  })

  test('Upgrade to Team creates a real Stripe Checkout session', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    const upgrade = page.getByRole('button', { name: /upgrade to team/i }).first()
    if (!(await upgrade.count()))
      test.skip(true, 'No "Upgrade to Team" button rendered (price not configured)')
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/billing/checkout'), {
      timeout: 12_000,
    })
    await upgrade.click()
    const resp = await respPromise
    expect(resp.status()).toBe(200)
    await page.waitForTimeout(3500)
    expect(page.url(), 'page must navigate to a real Stripe Checkout URL').toMatch(
      /checkout\.stripe\.com\/.*cs_test_/,
    )
  })
})
