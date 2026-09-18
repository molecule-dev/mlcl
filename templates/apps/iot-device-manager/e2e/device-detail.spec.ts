import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createDeviceApi, listCommands, signup } from './_helpers.js'

test.describe('Device detail — telemetry, command log, send command', () => {
  test('Loads device data, surfaces empty telemetry/command log', async ({ page }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Detail-Sensor-1',
      device_type: 'sensor',
    })
    await page.goto(APP_BASE + `/devices/${dev.id}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByRole('heading', { name: 'Detail-Sensor-1' })).toBeVisible()
    await expect(page.getByText(/No telemetry yet/i)).toBeVisible()
    await expect(page.getByText(/No commands sent yet/i)).toBeVisible()
  })

  test('Send-reboot button POSTs /api/commands and the command appears in the log', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Reboot-Target',
      device_type: 'gateway',
    })
    await page.goto(APP_BASE + `/devices/${dev.id}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reboot/i }).click()
      // Wait for the toast/feedback or the log to populate.
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/commands(\?|$)/.test(r.url))
    expect(post, 'expected POST /api/commands').toBeTruthy()
    expect(post!.status).toBe(201)

    // Read-after-write: the command must appear in the device's command list.
    const cmds = await listCommands(page, accessToken, dev.id)
    expect(cmds.length).toBeGreaterThan(0)
    expect(cmds[0].command_type).toBe('reboot')
    expect(cmds[0].status).toBe('pending')

    // The UI's command log section also reflects the new row.
    await expect(page.getByText(/^reboot$/).first()).toBeVisible({ timeout: 10000 })
  })

  test('Custom command modal sends the chosen command_type with JSON payload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Custom-Cmd',
      device_type: 'controller',
    })
    await page.goto(APP_BASE + `/devices/${dev.id}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: /Send command/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('input[list="cmd-types"]').fill('config_refresh')
    await dialog.locator('textarea').fill('{"target":"primary"}')
    const reqs = await captureNetwork(page, async () => {
      await dialog.getByRole('button', { name: /^Send command$/i }).click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/commands(\?|$)/.test(r.url))
    expect(post, 'expected POST /api/commands').toBeTruthy()
    expect(post!.status).toBe(201)

    const cmds = await listCommands(page, accessToken, dev.id)
    const refresh = cmds.find((c) => c.command_type === 'config_refresh')
    expect(refresh, 'config_refresh command should exist').toBeTruthy()
    const payload =
      typeof refresh!.payload === 'string'
        ? JSON.parse(refresh!.payload as string)
        : refresh!.payload
    expect((payload as { target?: string }).target).toBe('primary')
  })

  test('Invalid JSON payload surfaces a UI error and does NOT POST', async ({ page }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Bad-Payload',
      device_type: 'sensor',
    })
    await page.goto(APP_BASE + `/devices/${dev.id}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: /Send command/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[list="cmd-types"]').fill('diagnostics')
    await dialog.locator('textarea').fill('{not json}')
    const reqs = await captureNetwork(page, async () => {
      await dialog.getByRole('button', { name: /^Send command$/i }).click()
      await page.waitForTimeout(400)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/commands(\?|$)/.test(r.url))
    expect(post, 'no /api/commands POST should fire on invalid JSON').toBeFalsy()
    await expect(page.getByText(/must be valid JSON/i)).toBeVisible()
  })
})
