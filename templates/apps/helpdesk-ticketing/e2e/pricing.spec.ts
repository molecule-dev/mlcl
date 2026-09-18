import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('helpdesk-ticketing: /pricing', () => {
  test('public /pricing renders Free / Pro / Team without role=alert', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    const body = page.locator('body')
    await expect(body).toContainText(/Free/i)
    await expect(body).toContainText(/Pro/i)
    await expect(body).toContainText(/Team/i)
    await expect(page.locator('[role=alert]')).toHaveCount(0)
  })

  test('/pricing fetches /api/billing/tiers (no /billing/tiers misroute to Vite index.html)', async ({
    page,
  }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => r.url.includes('/api/billing/tiers'))).toBe(true)
  })

  test('/pricing tier rendering implies a 200 from /api/billing/tiers (no HTML masquerading as JSON)', async ({
    page,
  }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    const tiersReq = reqs.find((r) => r.url.includes('/api/billing/tiers'))
    expect(tiersReq?.status).toBe(200)
  })

  test('public /api/billing/tiers exposes free / pro / team tiers (regression — was 0010 missed payments)', async ({
    page,
  }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data: Array<{ key: string }> }
    expect(body.data.map((t) => t.key).sort()).toEqual(['free', 'pro', 'team'])
  })
})
