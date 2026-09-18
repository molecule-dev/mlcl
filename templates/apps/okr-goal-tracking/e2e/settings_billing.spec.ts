/**
 * /settings/billing — workspace billing page (current plan, period toggle,
 * tier cards, upgrade buttons, CSV download).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings/billing', () => {
  test('back-to-settings link navigates to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await page.getByRole('link', { name: /←\s*settings/i }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('renders current plan card with a plan name', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('current-plan-name')).toBeVisible()
    await expect(page.getByTestId('current-plan-name')).not.toBeEmpty()
  })

  test('CSV download button triggers a downloadable file', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.getByTestId('download-billing-csv').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/okr-billing-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  test('Monthly period button is pressed by default', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('billing-period-month')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Yearly period button toggles aria-pressed on click', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await page.getByTestId('billing-period-year').click()
    await expect(page.getByTestId('billing-period-year')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('billing-period-month')).toHaveAttribute('aria-pressed', 'false')
  })

  test('three tier cards render (free, pro, team)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('billing-tier-free')).toBeVisible()
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
    await expect(page.getByTestId('billing-tier-team')).toBeVisible()
  })

  test('Upgrade-pro click hits POST /api/billing/checkout and redirects to Stripe', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('upgrade-pro').click()
      await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(checkout, 'POST /api/billing/checkout should fire').toBeTruthy()
    expect(checkout!.status).toBe(200)
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('initial mount fetches /api/billing/status and /api/billing/tiers', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/billing')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const status = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(status).toBeTruthy()
    expect(tiers).toBeTruthy()
  })
})
