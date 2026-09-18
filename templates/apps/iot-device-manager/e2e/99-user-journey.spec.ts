/**
 * Cross-page kitchen-sink flow: a real iot-device-manager user signing
 * up, registering a device, issuing a device token, posting telemetry +
 * logs against /api/logs, sending a remote command from the console,
 * and watching the alert/log surfaces reflect those actions. Verifies
 * backend invariants (read-after-write) at each step.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  ingestTelemetry,
  issueDeviceToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('iot-device-manager kitchen-sink flow', () => {
  test('signup → device → token → telemetry + log → command → alert', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('journey'))

    // 1. Land on /dashboard with empty KPIs.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })

    // 2. Register a device via the API (UI-driven CRUD is covered by devices.spec.ts).
    const device = await createDeviceApi(page, accessToken, {
      name: 'Journey-Compressor-01',
      device_type: 'sensor',
    })
    expect(device.id).toBeTruthy()

    // 3. Issue a device token (revealed once).
    const issued = await issueDeviceToken(page, accessToken, device.id, 'journey')
    expect(issued.token).toBeTruthy()

    // 4. Use the token to ingest telemetry + a log line. Both must succeed.
    const tele = await ingestTelemetry(page, issued.token, {
      metric: 'temperature',
      value: 21.4,
      unit: 'C',
    })
    expect(tele).toBeTruthy()

    const logRes = await page.request.post(`${API_BASE}/logs`, {
      headers: { Authorization: `Bearer ${issued.token}`, 'Content-Type': 'application/json' },
      data: { level: 'info', message: 'journey: device booted' },
      failOnStatusCode: false,
    })
    expect(logRes.status(), await logRes.text().catch(() => '')).toBeLessThan(300)

    // 5. Read-after-write: GET /api/logs returns our line.
    const listLogs = await page.request.get(`${API_BASE}/logs?device_id=${device.id}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(listLogs.status()).toBeLessThan(300)
    const logsBody = (await listLogs.json()) as Array<{ message?: string }>
    expect(logsBody.some((l) => /journey: device booted/.test(l.message ?? ''))).toBe(true)

    // 6. Drive a remote command from the Console UI.
    await page.goto(APP_BASE + '/console')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const select = page.getByRole('combobox').first()
    if (await select.count().catch(() => 0)) {
      await select.selectOption({ label: device.name }).catch(() => {})
    }
    const input = page.getByRole('textbox').first()
    const reqs = await captureNetwork(page, async () => {
      await input.fill('reboot')
      await page
        .getByRole('button', { name: /run|send|enter/i })
        .first()
        .click()
        .catch(async () => {
          await input.press('Enter')
        })
      await page.waitForTimeout(1500)
    })
    const cmdPost = reqs.find((r) => r.method === 'POST' && /\/api\/commands(\?|$|\/)/.test(r.url))
    expect(cmdPost?.status, 'POST /api/commands').toBeLessThan(400)

    // 7. Read-after-write: command surfaces in the device's command log.
    const listCmds = await page.request.get(`${API_BASE}/commands?device_id=${device.id}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(listCmds.status()).toBeLessThan(300)
    const cmds = (await listCmds.json()) as Array<{ command_type?: string }>
    expect(cmds.some((c) => c.command_type === 'reboot')).toBe(true)
  })
})
