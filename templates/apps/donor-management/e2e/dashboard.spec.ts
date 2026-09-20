import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, waitForSeed } from './_helpers.js'

test.describe('dashboard', () => {
  test('KPI row and campaign progress render for a seeded account', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /^dashboard$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/raised this year/i)).toBeVisible()
    await expect(page.getByText(/^donors$/i)).toBeVisible()
    await expect(page.getByText(/average gift/i)).toBeVisible()
    await expect(page.getByText(/gifts this year/i)).toBeVisible()
    // Campaign progress bars + recent gifts list render from the same summary.
    await expect
      .poll(async () => page.getByRole('progressbar').count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(1)
    await expect(page.getByRole('heading', { name: /recent gifts/i, level: 2 })).toBeVisible()
  })

  test('record-gift CTA links to the gift form', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /\+ record gift/i }).click()
    await expect(page).toHaveURL(/\/gifts\/new/, { timeout: 10000 })
  })
})
