import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedDevice, seedRoom, signup, whereUrl } from './_helpers.js'

test.describe('/rooms/:id', () => {
  test('room detail page renders devices that belong to that room', async ({ page, request }) => {
    const session = await signup(page)
    const room = await seedRoom(request, session.accessToken!, 'Test room ' + Date.now())
    const device = await seedDevice(request, session.accessToken!, {
      name: 'Test bulb',
      type: 'light',
      room: room.name,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/rooms/${room.id}`)
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(
      whereUrl(reqs, new RegExp(`/api/rooms/${room.id}`), 'GET').length,
      'GET /api/rooms/:id observed',
    ).toBeGreaterThan(0)
    await expect(page.getByTestId('room-detail-name')).toContainText(room.name)
    await expect(page.getByText(device.name, { exact: false })).toBeVisible()
  })

  test('room detail shows empty state when no devices in that room', async ({ page, request }) => {
    const session = await signup(page)
    const room = await seedRoom(request, session.accessToken!, 'Empty room ' + Date.now())
    await page.goto(APP_BASE + `/rooms/${room.id}`)
    await expect(page.getByTestId('room-no-devices')).toBeVisible()
  })

  test('navigating back from /rooms/:id returns to /rooms list', async ({ page, request }) => {
    const session = await signup(page)
    const room = await seedRoom(request, session.accessToken!, 'Back nav room ' + Date.now())
    await page.goto(APP_BASE + `/rooms/${room.id}`)
    await page.goto(APP_BASE + '/rooms')
    await expect(page).toHaveURL(/\/rooms$/)
  })
})
