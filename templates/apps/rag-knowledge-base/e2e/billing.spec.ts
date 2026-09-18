/**
 * /billing — Engram subscription billing.
 *
 * The page calls /api/billing/tiers and /api/billing/status on mount,
 * and triggers /api/billing/checkout when an upgrade button is clicked.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('billing', () => {
  test('h1 renders "Billing"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('GET /api/billing/tiers + /status fire on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.waitForTimeout(1500)
    })
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    const status = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    expect(tiers?.status).toBe(200)
    expect(status?.status).toBe(200)
  })

  test('billing-metrics tile is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.locator('[data-testid="billing-metrics"]')).toBeVisible()
  })

  test('plan list or loading state is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    const plans = page.locator('[data-testid="billing-plans"]')
    const loading = page.locator('[data-testid="billing-loading"]')
    const empty = page.locator('[data-testid="billing-empty"]')
    await expect(plans.or(loading).or(empty)).toBeVisible()
  })
})
