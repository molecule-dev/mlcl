import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  listCommands,
  listFirmware,
  signup,
} from './_helpers.js'

test.describe('Firmware — versions, publish, rollout', () => {
  test('Empty state with zero campaigns and the rollout button is disabled', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/firmware')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText(/No firmware versions yet/i)).toBeVisible()
    const start = page.locator('[data-mol-id="firmware-start-rollout"]')
    await expect(start).toBeDisabled()
  })

  test('Upload firmware modal POSTs /api/firmware AND auto-publishes', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/firmware')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.locator('[data-mol-id="firmware-upload"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('input[type="text"]').fill('2.4.1')
    await dialog.locator('select').selectOption('sensor')
    await dialog.locator('textarea').fill('Improved telemetry sampling')
    const reqs = await captureNetwork(page, async () => {
      await dialog.locator('[data-mol-id="firmware-upload-submit"]').click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/firmware(\?|$)/.test(r.url))
    expect(post, 'POST /api/firmware').toBeTruthy()
    expect(post!.status).toBe(201)
    const publish = reqs.find(
      (r) => r.method === 'POST' && /\/api\/firmware\/[^/]+\/publish/.test(r.url),
    )
    expect(publish, 'POST /api/firmware/:id/publish (auto-publish)').toBeTruthy()
    expect(publish!.status).toBeLessThan(300)

    const list = await listFirmware(page, accessToken)
    const fw = list.find((f) => f.version === '2.4.1' && f.device_type === 'sensor')
    expect(fw, 'firmware 2.4.1 sensor should exist').toBeTruthy()
    expect(fw!.status).toBe('published')
    expect(fw!.released_at, 'released_at should be set after publish').toBeTruthy()
  })

  test('Rollout end-to-end: published firmware → device → command + task created', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Rollout-Target',
      device_type: 'sensor',
    })

    // Create a published firmware via API to skip past the upload UI.
    const fwRes = await page.request.post(`${API_BASE}/firmware`, {
      headers: apiHeaders(accessToken),
      data: { version: '3.0.0', device_type: 'sensor', release_notes: 'rollout test' },
      failOnStatusCode: false,
    })
    expect(fwRes.status()).toBe(201)
    const fw = (await fwRes.json()) as { id: string; status: string }
    expect(fw.id).toBeTruthy()
    const pubRes = await page.request.post(`${API_BASE}/firmware/${fw.id}/publish`, {
      headers: apiHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(pubRes.status()).toBeLessThan(300)

    await page.goto(APP_BASE + '/firmware')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.locator('[data-mol-id="firmware-start-rollout"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-mol-id="firmware-rollout-version"]').selectOption(fw.id)
    await dialog.locator(`[data-mol-id="firmware-rollout-device-${dev.id}"]`).check()
    const reqs = await captureNetwork(page, async () => {
      await dialog.locator('[data-mol-id="firmware-rollout-submit"]').click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/firmware\/rollouts/.test(r.url))
    expect(post, 'POST /api/firmware/rollouts').toBeTruthy()
    expect(post!.status).toBe(201)

    // Read-after-write: a firmware_update command should now exist for the device
    // — that's what the rollout creates per target.
    const cmds = await listCommands(page, accessToken, dev.id)
    const fwCmd = cmds.find((c) => c.command_type === 'firmware_update')
    expect(fwCmd, 'firmware_update command should be queued').toBeTruthy()

    // The success feedback should mention 1 device.
    await expect(page.getByText(/Rollout queued for 1 device/i)).toBeVisible({ timeout: 10000 })
  })

  test('Rollout to an unowned firmware id is rejected with 404', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/firmware/rollouts`, {
      headers: apiHeaders(accessToken),
      data: { firmware_id: '00000000-0000-0000-0000-000000000000', device_ids: [] },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(404)
  })

  test('Rollout with no targets surfaces 400', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fwRes = await page.request.post(`${API_BASE}/firmware`, {
      headers: apiHeaders(accessToken),
      data: { version: '4.0.0', device_type: 'gateway' },
      failOnStatusCode: false,
    })
    const fw = (await fwRes.json()) as { id: string }
    await page.request.post(`${API_BASE}/firmware/${fw.id}/publish`, {
      headers: apiHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    const res = await page.request.post(`${API_BASE}/firmware/rollouts`, {
      headers: apiHeaders(accessToken),
      data: { firmware_id: fw.id, device_ids: [] },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })
})
