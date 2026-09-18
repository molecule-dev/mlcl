import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  listDevices,
  signup,
} from './_helpers.js'

test.describe('Devices — registry CRUD', () => {
  test('empty state on a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/devices')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText(/No devices yet/i)).toBeVisible()
  })

  test('Register device modal POSTs /api/devices and the new row appears in the list', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/devices')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: /register device/i }).click()
    await expect(page.getByRole('heading', { name: /Register a new device/i })).toBeVisible()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[placeholder="Compressor-04"]').fill('Pump-North-7')
    await dialog.locator('input[placeholder="IOT-XXXXXX"]').fill('IOT-NORTH-7')
    await dialog.locator('select').selectOption('actuator')
    const reqs = await captureNetwork(page, async () => {
      await dialog.getByRole('button', { name: /^Register$/i }).click()
      await expect(dialog).toBeHidden({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/devices(\?|$)/.test(r.url))
    expect(post, 'expected POST /api/devices').toBeTruthy()
    expect(post!.status).toBe(201)

    // Read-after-write: the new device appears in the table AND in a fresh API list.
    await expect(page.getByText('Pump-North-7')).toBeVisible()
    const devs = await listDevices(page, accessToken)
    const created = devs.find((d) => d.name === 'Pump-North-7')
    expect(created, 'device should round-trip via /api/devices').toBeTruthy()
    expect(created!.device_type).toBe('actuator')
    expect(created!.serial_number).toBe('IOT-NORTH-7')
    expect(created!.status).toBe('offline')
  })

  test('Search filter narrows the visible list to matching devices', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDeviceApi(page, accessToken, { name: 'Boiler-Alpha', serial_number: 'IOT-BA-1' })
    await createDeviceApi(page, accessToken, { name: 'Pump-Beta', serial_number: 'IOT-PB-2' })
    await createDeviceApi(page, accessToken, { name: 'Pump-Gamma', serial_number: 'IOT-PG-3' })

    await page.goto(APP_BASE + '/devices')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText('Boiler-Alpha')).toBeVisible()
    await expect(page.getByText('Pump-Beta')).toBeVisible()

    await page.getByPlaceholder(/Device name or serial/i).fill('pump')
    await expect(page.getByText('Boiler-Alpha')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Pump-Beta')).toBeVisible()
    await expect(page.getByText('Pump-Gamma')).toBeVisible()
  })

  test('Status filter buttons drive the list contents', async ({ page }) => {
    const { accessToken } = await signup(page)
    const offlineDev = await createDeviceApi(page, accessToken, {
      name: 'Off-1',
      device_type: 'sensor',
    })
    // Mark a device online via PUT /api/devices/:id (status=online) so the
    // online filter has a hit.
    const onlineDev = await createDeviceApi(page, accessToken, {
      name: 'On-2',
      device_type: 'sensor',
    })
    const updateRes = await page.request.put(`${API_BASE}/devices/${onlineDev.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'online' },
      failOnStatusCode: false,
    })
    expect(updateRes.status()).toBeLessThan(300)

    await page.goto(APP_BASE + '/devices')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText('On-2').first()).toBeVisible()
    await expect(page.getByText('Off-1').first()).toBeVisible()

    await page
      .getByRole('button', { name: /^online$/i })
      .first()
      .click()
    await expect(page.getByText('On-2').first()).toBeVisible()
    await expect(page.getByText('Off-1')).toHaveCount(0, { timeout: 5000 })

    await page
      .getByRole('button', { name: /^offline$/i })
      .first()
      .click()
    await expect(page.getByText('Off-1').first()).toBeVisible()
    await expect(page.getByText('On-2')).toHaveCount(0, { timeout: 5000 })
    expect(offlineDev.id).toBeTruthy()
  })

  test('Clicking a device row routes to /devices/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Clicker-1',
      device_type: 'sensor',
    })
    await page.goto(APP_BASE + '/devices')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByText('Clicker-1').first().click()
    await page.waitForURL(new RegExp(`/devices/${dev.id}`), { timeout: 10000 })
  })
})
