/**
 * /billing — current plan + invoice history.
 *
 * Real outcomes: GET /api/billing/summary returns 200; the plan name on
 * card matches the API; for a fresh user (no payments) the invoice
 * history empty-state renders; the View-plans CTA actually routes to /pricing.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

interface BillingSummary {
  plan: { planKey: string; name: string; isFree: boolean; limits: any }
  invoices: any[]
}

test.describe('/billing', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('h1 reads "Billing"', async ({ page }) => {
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByRole('heading', { name: /^Billing$/i, level: 1 })).toBeVisible()
  })

  test('GET /api/billing/summary returns 200 with a plan + invoices array', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await expect(page.getByRole('heading', { name: /^Billing$/i, level: 1 })).toBeVisible()
    })
    const req = reqs.find((r) => /\/api\/billing\/summary/.test(r.url) && r.method === 'GET')
    expect(req?.status).toBe(200)
    const data = await authedGet<BillingSummary>(page, '/billing/summary')
    expect(data.plan).toBeDefined()
    expect(Array.isArray(data.invoices)).toBe(true)
  })

  test('Current plan label renders', async ({ page }) => {
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByText(/Current plan/i)).toBeVisible()
  })

  test('AI generations included row renders for plans that publish a maxGenerate limit', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/billing')
    // Either the row exists, or the plan doesn't publish a maxGenerate limit
    // (in which case the section is suppressed). Both are valid; assert that
    // SOME plan information is visible.
    const plan = await authedGet<BillingSummary>(page, '/billing/summary')
    if (typeof plan.plan?.limits?.maxGenerate === 'number') {
      await expect(page.getByText(/AI generations included/i)).toBeVisible()
    } else {
      // Otherwise just confirm the plan name renders.
      await expect(page.getByText(plan.plan.name)).toBeVisible()
    }
  })

  test('View plans / Change plan button routes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/billing')
    await page.getByRole('button', { name: /(View plans|Change plan)/i }).click()
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('Invoice history section heading renders', async ({ page }) => {
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByRole('heading', { name: /Invoice history/i, level: 2 })).toBeVisible()
  })

  test('No invoices yet empty-state renders for fresh user', async ({ page }) => {
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByText(/No invoices yet/i)).toBeVisible()
  })

  test('Open account settings link routes to /settings', async ({ page }) => {
    await page.goto(APP_BASE + '/billing')
    await page.getByRole('link', { name: /Open account settings/i }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })
})
