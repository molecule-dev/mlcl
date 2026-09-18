/**
 * /billing — tiers + period switch. Asserts tier cards render, current
 * plan badge shows, period switch flips price suffix, and /api/billing/*
 * is actually called on load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('billing (/billing)', () => {
  test('renders all configured tiers (free + pro)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByTestId('billing-tier-free')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
  })

  test('marks the user as currently on the free tier', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await expect(page.getByTestId('billing-tier-free-current')).toBeVisible({ timeout: 10000 })
  })

  test('switching the period filter updates the displayed prices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.getByTestId('billing-period-year').click()
    await expect(page.getByTestId('billing-tier-pro')).toContainText('/yr')
  })

  test('initial load fetches /api/billing/tiers and /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await page.waitForLoadState('networkidle')
    })
    const got = (path: string) =>
      reqs.some((r) => r.method === 'GET' && r.url.includes(path) && r.status < 400)
    expect(got('/api/billing/tiers'), JSON.stringify(reqs.map((r) => r.url))).toBe(true)
    expect(got('/api/billing/status')).toBe(true)
  })
})
