import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('renders MetroPulse hero, stop search, and CTAs', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await expectNoConsoleErrors(page, async () => {
        await page.goto(APP_BASE + '/')
      })
    })
    expect(reqs.length, 'landing fired at least one request').toBeGreaterThan(0)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
    await expect(page.locator('[data-mol-id="stop-search-input"]')).toBeVisible()
  })

  test('public network endpoints are reachable without auth', async ({ page }) => {
    const lines = await page.request.get(`${API_BASE}/network/lines`)
    expect(lines.ok(), 'network lines endpoint reachable').toBe(true)
    expect(Array.isArray(await lines.json())).toBe(true)

    const stops = await page.request.get(`${API_BASE}/network/stops`)
    expect(stops.ok(), 'network stops endpoint reachable').toBe(true)
    expect(Array.isArray(await stops.json())).toBe(true)
  })

  test('clicking "Sign up" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="/signup"]').first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
