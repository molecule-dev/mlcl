import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedDevice, signup, whereUrl } from './_helpers.js'

test.describe('/activity', () => {
  test('activity page renders empty state for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/activity')
    await expect(page.getByTestId('activity-page')).toBeVisible()
    await expect(page.getByTestId('activity-empty')).toBeVisible()
  })

  test('activity page renders events after a device toggle', async ({ page, request }) => {
    const session = await signup(page)
    const device = await seedDevice(request, session.accessToken!, {
      name: 'Trigger device',
      type: 'light',
      room: 'Living room',
    })
    const api = await authedApi(request, session.accessToken!)
    const toggleRes = await api.post(`/iot-devices/${device.id}/toggle`, {})
    expect(toggleRes.status()).toBeLessThan(400)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/activity')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/activity(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
    await expect(page.getByTestId('activity-list')).toBeVisible()
    await expect(page.locator('[data-testid="activity-item"]').first()).toBeVisible()
  })

  test('navigating from /activity back to /overview works', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/activity')
    await page.goto(APP_BASE + '/overview')
    await expect(page).toHaveURL(/\/overview/)
  })
})
