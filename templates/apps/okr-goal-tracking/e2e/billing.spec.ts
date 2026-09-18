import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, APP_BASE } from './_helpers.js'

test.describe('Billing page', () => {
  test('shows live tiers + current plan; period switch works', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')

    await expect(page.getByTestId('billing-page')).toBeVisible()
    await expect(page.getByTestId('current-plan-name')).toHaveText(/free/i)

    // All three tiers from the registry render.
    await expect(page.getByTestId('billing-tier-free')).toBeVisible()
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
    await expect(page.getByTestId('billing-tier-team')).toBeVisible()

    // The current tier (free) shows its own CTA disabled.
    const freeCta = page.getByTestId('upgrade-free')
    await expect(freeCta).toBeDisabled()
    await expect(freeCta).toContainText(/current plan/i)

    // Switch to yearly — the tile prices should change (or fall back to monthly if no yearly).
    await page.getByTestId('billing-period-year').click()
    await expect(page.getByTestId('billing-period-year')).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('billing-period-month').click()
    await expect(page.getByTestId('billing-period-month')).toHaveAttribute('aria-pressed', 'true')
  })

  test('download summary CSV produces a file', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
    await page.getByTestId('download-billing-csv').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/okr-billing.*\.csv/)
  })
})
