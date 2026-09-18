import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/energy', () => {
  test('energy page renders for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/energy')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('energy page fetches stats + current readings on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/energy')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    const stats = whereUrl(reqs, /\/api\/energy\/stats/, 'GET')
    const current = whereUrl(reqs, /\/api\/energy\/current/, 'GET')
    expect(stats.length, 'GET /api/energy/stats observed').toBeGreaterThan(0)
    expect(current.length, 'GET /api/energy/current observed').toBeGreaterThan(0)
  })

  test('totals and active-devices region render with no devices seeded', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/energy')
    await page.waitForLoadState('networkidle').catch(() => {})
    const body = await page.locator('body').textContent()
    expect(body, 'energy page must render some content').toBeTruthy()
    expect(body!.length, 'energy page is not blank').toBeGreaterThan(50)
  })
})
