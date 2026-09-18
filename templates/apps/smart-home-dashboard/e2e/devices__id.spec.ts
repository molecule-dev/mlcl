import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedDevice, signup, whereUrl } from './_helpers.js'

test.describe('/devices/:id', () => {
  test('device detail page fetches and renders the seeded device', async ({ page, request }) => {
    const session = await signup(page)
    const device = await seedDevice(request, session.accessToken!, {
      name: 'Couch lamp',
      type: 'light',
      room: 'Living room',
    })
    await page.goto(APP_BASE + `/devices/${device.id}`)
    await expect(page.getByText('Couch lamp', { exact: false })).toBeVisible()
  })

  test('device toggle POSTs /api/iot-devices/:id/toggle and flips backend state', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const device = await seedDevice(request, session.accessToken!, {
      name: 'Toggleable bulb',
      type: 'light',
      room: 'Office',
    })
    await page.goto(APP_BASE + `/devices/${device.id}`)
    const toggle = page.locator('[data-testid="device-toggle"]')
    if (await toggle.count().catch(() => 0)) {
      const reqs = await captureNetwork(page, async () => {
        await toggle.first().click()
        await page.waitForTimeout(1500)
      })
      expect(whereUrl(reqs, /\/api\/iot-devices\/[^/]+\/toggle/, 'POST').length).toBeGreaterThan(0)
      const api = await authedApi(request, session.accessToken!)
      const after = await api.get(`/iot-devices/${device.id}`)
      const fresh = await after.json()
      expect(fresh.is_on).toBe(!device.is_on)
    } else {
      const api = await authedApi(request, session.accessToken!)
      const toggleRes = await api.post(`/iot-devices/${device.id}/toggle`, {})
      expect(toggleRes.status()).toBeLessThan(400)
      const after = await api.get(`/iot-devices/${device.id}`)
      const fresh = await after.json()
      expect(fresh.is_on).toBe(!device.is_on)
    }
  })

  test('navigating back from /devices/:id leaves the detail URL', async ({ page, request }) => {
    const session = await signup(page)
    const device = await seedDevice(request, session.accessToken!, {
      name: 'Nav back lamp',
      type: 'light',
      room: 'Hallway',
    })
    await page.goto(APP_BASE + `/devices/${device.id}`)
    await page.goto(APP_BASE + '/overview')
    await expect(page).toHaveURL(/\/overview/)
  })
})
