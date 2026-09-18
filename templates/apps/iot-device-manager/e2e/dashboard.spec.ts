import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  getFleetReport,
  signup,
} from './_helpers.js'

test.describe('Dashboard — fleet command summary', () => {
  test('Dashboard shows zeroed fleet KPIs for a brand-new account', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    })
    const fleet = reqs.find((r) => r.method === 'GET' && /\/api\/reports\/fleet/.test(r.url))
    const tput = reqs.find((r) => r.method === 'GET' && /\/api\/reports\/throughput/.test(r.url))
    const dev = reqs.find((r) => r.method === 'GET' && /\/api\/devices(\?|$)/.test(r.url))
    const al = reqs.find((r) => r.method === 'GET' && /\/api\/alerts(\?|$)/.test(r.url))
    expect(fleet?.status, 'GET /api/reports/fleet').toBeLessThan(300)
    expect(tput?.status, 'GET /api/reports/throughput').toBeLessThan(300)
    expect(dev?.status, 'GET /api/devices').toBeLessThan(300)
    expect(al?.status, 'GET /api/alerts').toBeLessThan(300)

    // The KPI tile labels render even with zero state. The "Active alerts"
    // string also appears in the empty-state hint, so anchor on the KPI label
    // (uppercase, in a span) by using getByText with exact match.
    await expect(page.getByText('Devices in fleet', { exact: true })).toBeVisible()
    await expect(page.getByText('Active alerts', { exact: true })).toBeVisible()
    await expect(page.getByText(/No devices yet/i)).toBeVisible()

    const report = await getFleetReport(page, accessToken)
    expect(report.devices_total).toBe(0)
    expect(report.active_alerts).toBe(0)
  })

  test('Dashboard reflects newly-registered devices on next load', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDeviceApi(page, accessToken, { name: 'Compressor-A1', device_type: 'sensor' })
    const second = await createDeviceApi(page, accessToken, {
      name: 'Compressor-A2',
      device_type: 'sensor',
    })
    // The activity feed only includes devices in {online,warning,critical} status —
    // new devices default to "offline". Promote one to online so the feed renders it.
    const update = await page.request.put(`${API_BASE}/devices/${second.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'online' },
      failOnStatusCode: false,
    })
    expect(update.status()).toBeLessThan(300)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const report = await getFleetReport(page, accessToken)
    expect(report.devices_total).toBe(2)
    expect(report.devices_online).toBe(1)
    // The activity feed surfaces the online device.
    await expect(page.getByText('Compressor-A2', { exact: false })).toBeVisible()
  })

  test('Dashboard renders a heading once data is loaded', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })
})
