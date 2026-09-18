import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listMeters, signup } from './_helpers.js'

test.describe('Device detail /devices/:id', () => {
  test('loads the meter and at least one of meter/readings/tokens GETs', async ({ page }) => {
    const { accessToken } = await signup(page)
    const meters = await listMeters(page, accessToken)
    const target = meters.find((m) => m.status === 'active') ?? meters[0]
    expect(target, 'a seeded meter exists').toBeTruthy()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/devices/' + target.id)
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const meter = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/meters/${target.id}(\\?|$)`).test(r.url),
    )
    const readings = reqs.find(
      (r) => r.method === 'GET' && /\/api\/readings\?meter_id=/.test(r.url),
    )
    expect(meter || readings, 'one of /api/meters/:id or /api/readings?meter_id=:id').toBeTruthy()
    if (meter) expect(meter.status).toBeLessThan(400)
    if (readings) expect(readings.status).toBeLessThan(400)
  })

  test('renders main content (kWh or W) instead of a 404', async ({ page }) => {
    const { accessToken } = await signup(page)
    const meters = await listMeters(page, accessToken)
    const target = meters[0]
    await page.goto(APP_BASE + '/devices/' + target.id)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('main')).toContainText(/kWh|W\b|reading/i)
  })

  test('back link returns to /devices', async ({ page }) => {
    const { accessToken } = await signup(page)
    const meters = await listMeters(page, accessToken)
    const target = meters[0]
    await page.goto(APP_BASE + '/devices/' + target.id)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const back = page.getByRole('link', { name: /devices|back/i }).first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(/\/devices$/)
    } else {
      // No explicit back affordance — assert nav has a Devices entry instead.
      await page
        .getByRole('link', { name: /devices/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/devices$/)
    }
  })
})
