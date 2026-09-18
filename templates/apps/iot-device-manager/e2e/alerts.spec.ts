import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  listAlerts,
  signup,
} from './_helpers.js'

test.describe('Alerts — surface, acknowledge, resolve, evaluate', () => {
  test('Empty state on a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="alerts-empty"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="alerts-empty"]')).toContainText(/No alerts/i)
  })

  test('Created alert shows in the UI; Acknowledge persists status; Resolve persists status', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Beacon-1',
      device_type: 'sensor',
    })
    const alertRes = await page.request.post(`${API_BASE}/alerts`, {
      headers: apiHeaders(accessToken),
      data: {
        device_id: dev.id,
        type: 'manual',
        severity: 'critical',
        message: 'Simulated overheat at 92C',
      },
      failOnStatusCode: false,
    })
    expect(alertRes.status()).toBe(201)
    const alert = (await alertRes.json()) as { id: string }

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText('Simulated overheat at 92C')).toBeVisible()
    await expect(page.locator(`[data-mol-id="alerts-status-${alert.id}"]`)).toContainText('open')

    // Acknowledge
    const ackReqs = await captureNetwork(page, async () => {
      await page.locator(`[data-mol-id="alerts-ack-${alert.id}"]`).click()
      await expect(page.locator(`[data-mol-id="alerts-status-${alert.id}"]`)).toContainText(
        'acknowledged',
        { timeout: 10000 },
      )
    })
    const ackPut = ackReqs.find(
      (r) => r.method === 'PUT' && new RegExp(`/api/alerts/${alert.id}`).test(r.url),
    )
    expect(ackPut, 'PUT /api/alerts/:id (ack)').toBeTruthy()
    expect(ackPut!.status).toBeLessThan(300)

    // Read-after-write: API confirms acknowledged + acknowledged_at populated
    let stored = await listAlerts(page, accessToken)
    let stillThis = stored.find((a) => a.id === alert.id)
    expect(stillThis?.status).toBe('acknowledged')
    expect(stillThis?.acknowledged_at).toBeTruthy()

    // Resolve
    const resReqs = await captureNetwork(page, async () => {
      await page.locator(`[data-mol-id="alerts-resolve-${alert.id}"]`).click()
      await page.waitForTimeout(800)
    })
    const resPut = resReqs.find(
      (r) => r.method === 'PUT' && new RegExp(`/api/alerts/${alert.id}`).test(r.url),
    )
    expect(resPut, 'PUT /api/alerts/:id (resolve)').toBeTruthy()

    stored = await listAlerts(page, accessToken)
    stillThis = stored.find((a) => a.id === alert.id)
    expect(stillThis?.status).toBe('resolved')
    expect(stillThis?.resolved_at).toBeTruthy()
  })

  test('Severity filter narrows the visible alerts', async ({ page }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'MultiAlert',
      device_type: 'sensor',
    })
    for (const sev of ['critical', 'warning', 'info'] as const) {
      const r = await page.request.post(`${API_BASE}/alerts`, {
        headers: apiHeaders(accessToken),
        data: { device_id: dev.id, type: 'manual', severity: sev, message: `${sev}-test-msg` },
        failOnStatusCode: false,
      })
      expect(r.status()).toBe(201)
    }
    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText('critical-test-msg')).toBeVisible()
    await expect(page.getByText('warning-test-msg')).toBeVisible()
    await expect(page.getByText('info-test-msg')).toBeVisible()

    await page.locator('[data-mol-id="alerts-filter-warning"]').click()
    await expect(page.getByText('warning-test-msg')).toBeVisible()
    await expect(page.getByText('critical-test-msg')).toHaveCount(0, { timeout: 5000 })
    await expect(page.getByText('info-test-msg')).toHaveCount(0)

    await page.locator('[data-mol-id="alerts-filter-all"]').click()
    await expect(page.getByText('critical-test-msg')).toBeVisible()
  })

  test('"Run offline check" creates offline alerts for stale devices and dedupes', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'StaleSensor',
      device_type: 'sensor',
    })
    // Force last_seen far in the past so the offline check matches.
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const upd = await page.request.put(`${API_BASE}/devices/${dev.id}`, {
      headers: apiHeaders(accessToken),
      data: { last_seen: old },
      failOnStatusCode: false,
    })
    expect(upd.status()).toBeLessThan(300)

    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Run offline check/i }).click()
      await expect(page.getByText(/Evaluation complete · 1 new alert/i)).toBeVisible({
        timeout: 10000,
      })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/alerts\/check/.test(r.url))
    expect(post, 'POST /api/alerts/check').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    // Read-after-write: an offline alert exists for the device.
    const alerts = await listAlerts(page, accessToken)
    const offline = alerts.find((a) => a.device_id === dev.id && a.type === 'offline')
    expect(offline, 'offline alert should exist for the stale device').toBeTruthy()
    expect(offline!.status).toBe('open')

    // Dedupe: a second invocation should NOT create another offline alert.
    const reqs2 = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Run offline check/i }).click()
      await expect(page.getByText(/Evaluation complete · 0 new alert/i)).toBeVisible({
        timeout: 10000,
      })
    })
    expect(
      reqs2.find((r) => r.method === 'POST' && /\/api\/alerts\/check/.test(r.url))!.status,
    ).toBeLessThan(300)
    const after = await listAlerts(page, accessToken)
    const offlines = after.filter(
      (a) => a.device_id === dev.id && a.type === 'offline' && a.status === 'open',
    )
    expect(offlines.length, 'dedupe: only one open offline alert per device').toBe(1)
  })
})
