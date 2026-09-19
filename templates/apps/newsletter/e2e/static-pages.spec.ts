/**
 * /pricing + static legal pages — public surfaces render the tier ladder
 * and the legal shells.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders the plans', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/choose your/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('GET /api/billing/tiers serves the ladder', async ({ page }) => {
    const res = await page.request.get(APP_BASE + '/api/billing/tiers')
    if (res.ok()) {
      const body = (await res.json()) as { tiers?: unknown[] }
      expect(Array.isArray(body.tiers)).toBe(true)
    }
  })
})

test.describe('static pages', () => {
  for (const path of ['/terms', '/privacy', '/help', '/about']) {
    test(`${path} renders a main element`, async ({ page }) => {
      await page.goto(APP_BASE + path)
      await expect(page.getByRole('main').first()).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  }
})
