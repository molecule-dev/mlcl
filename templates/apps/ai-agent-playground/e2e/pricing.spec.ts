import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('Pricing page (public)', () => {
  test('renders heading + three plan tiers + price labels', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your .* plan/i })).toBeVisible()
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/^pro$/i).first()).toBeVisible()
    await expect(page.getByText(/^team$/i).first()).toBeVisible()
    await expect(page.getByText(/\$15/).first()).toBeVisible()
    await expect(page.getByText(/\$49/).first()).toBeVisible()
  })

  test('lists per-tier limits (agents, executions)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/agents/i).first()).toBeVisible()
    await expect(page.getByText(/executions/i).first()).toBeVisible()
  })

  test('reload preserves the tier table render', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your .* plan/i })).toBeVisible()
    await page.reload()
    await expect(page.getByText(/\$15/).first()).toBeVisible({ timeout: 10000 })
  })
})
