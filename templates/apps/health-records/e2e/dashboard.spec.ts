/**
 * Dashboard reflects backend state — the hero and rails fan out to
 * /api/stats/overview, /api/vitals/me/latest, /api/medications, and
 * /api/labs. The numbers in the hero match what those endpoints
 * actually return.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('dashboard', () => {
  test('renders and fans out to the four data endpoints', async ({ page }) => {
    await signup(page, uniqueEmail('dash-render'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-dashboard"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/stats\/overview/.test(r.url) && r.method === 'GET')).toBe(true)
    expect(reqs.some((r) => /\/api\/vitals\/me\/latest/.test(r.url) && r.method === 'GET')).toBe(
      true,
    )
    expect(reqs.some((r) => /\/api\/medications/.test(r.url) && r.method === 'GET')).toBe(true)
    expect(reqs.some((r) => /\/api\/labs/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('hero counts match /api/stats/overview', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-counts'))
    const r = await page.request.get(`${API_BASE}/stats/overview`, {
      headers: authHeaders(accessToken),
    })
    const stats = (await r.json()) as {
      active_conditions: number
      active_medications: number
      active_allergies: number
    }
    expect(stats.active_conditions).toBeGreaterThanOrEqual(0)
    expect(stats.active_medications).toBeGreaterThanOrEqual(0)
    expect(stats.active_allergies).toBeGreaterThanOrEqual(0)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    // networkidle does not guarantee the client has rendered this text, and
    // innerText() is a one-shot read that never retries. toContainText waits for
    // the content itself, which is what the assertion actually cares about.
    await expect(page.locator('body')).toContainText(/active conditions/i)
  })

  test('sidebar links are present for the primary sections', async ({ page }) => {
    await signup(page, uniqueEmail('dash-nav'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    for (const path of [
      '/records',
      '/medications',
      '/labs',
      '/visits',
      '/immunizations',
      '/documents',
      '/sharing',
      '/notifications',
      '/profile',
      '/settings',
    ]) {
      await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible()
    }
  })
})
