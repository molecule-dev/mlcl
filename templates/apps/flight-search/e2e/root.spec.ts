import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('renders Skylark hero, value props, and CTAs', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await expectNoConsoleErrors(page, async () => {
        await page.goto(APP_BASE + '/')
      })
    })
    expect(reqs.length, 'landing fired at least one request').toBeGreaterThan(0)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
  })

  test('public airports/popular endpoint is reachable without auth', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/airports/popular`)
    expect(res.ok(), 'popular airports endpoint reachable').toBe(true)
    const body = (await res.json()) as Array<unknown>
    expect(Array.isArray(body)).toBe(true)
  })

  test('clicking "Sign up" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="/signup"]').first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
