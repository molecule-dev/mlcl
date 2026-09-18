import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedRoom, signup, whereUrl } from './_helpers.js'

test.describe('/overview', () => {
  test('overview page renders for a fresh user with no rooms', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/overview')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('overview fetches rooms and devices on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/overview')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    const r = whereUrl(reqs, /\/api\/rooms(?:\?|$|\b)/, 'GET')
    const d = whereUrl(reqs, /\/api\/iot-devices(?:\?|$|\b)/, 'GET')
    expect(r.length, 'GET /api/rooms observed').toBeGreaterThan(0)
    expect(d.length, 'GET /api/iot-devices observed').toBeGreaterThan(0)
  })

  test('seeded rooms show up on overview after a soft reload', async ({ page, request }) => {
    const session = await signup(page)
    await seedRoom(request, session.accessToken!, 'Overview test room ' + Date.now())
    await page.goto(APP_BASE + '/overview')
    await page.waitForLoadState('networkidle').catch(() => {})
    const body = await page.locator('body').textContent()
    expect(body, 'overview must surface the seeded room name somewhere').toMatch(
      /Overview test room/,
    )
  })
})
