import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/alerts (Service alerts) page', () => {
  test('lists active alerts and hits /api/alerts', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/alerts')
      await page.waitForTimeout(1500)
    })
    const alertsReq = reqs.find((r) => /\/api\/alerts/.test(r.url))
    expect(alertsReq, 'GET /api/alerts').toBeTruthy()
    expect(alertsReq?.status).toBeLessThan(400)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/alerts/i)
    // The page renders one card per active alert the API returns.
    const apiRes = await page.request.get(`${API_BASE}/alerts`)
    const rows = (await apiRes.json()) as Array<{ id: string }>
    const cards = await page.locator('[data-mol-id^="service-alert-"]').count()
    expect(cards).toBe(rows.length)
  })

  test('"Include resolved" toggle re-queries with all=1', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForTimeout(1500)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="alerts-show-all"]').click()
      await page.waitForTimeout(1000)
    })
    expect(reqs.some((r) => /\/api\/alerts\?all=1/.test(r.url))).toBe(true)
  })
})
