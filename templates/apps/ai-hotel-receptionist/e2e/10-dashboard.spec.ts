import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/dashboard', () => {
  test('mounts with the four room-status tiles and occupancy bar', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Today at the front desk/i })).toBeVisible({
      timeout: 15_000,
    })
    for (const status of ['vacant clean', 'occupied', 'cleaning', 'out of order']) {
      await expect(
        page.locator(`[data-mol-id^="dashboard-tile-"]`, { hasText: status }).first(),
      ).toBeVisible()
    }
    await expect(page.locator('[data-mol-id="dashboard-occupancy-value"]')).toContainText(/%/)
  })

  test('the room board renders one chip per physical room from the API', async ({ page }) => {
    await signup(page)
    const rooms = await page.evaluate(async () => {
      const resp = await fetch('/api/rooms', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ number: string }> }
      return body.data
    })
    expect(rooms.length, 'GET /api/rooms must return the seeded units').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/dashboard')
    for (const room of rooms) {
      await expect(page.locator('[data-mol-id="dashboard-room-' + room.number + '"]')).toBeVisible({
        timeout: 15_000,
      })
    }
  })

  test('arrivals and departures sections render (structure, not demo rows)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(
      page
        .getByRole('region', { name: /today.s arrivals/i })
        .or(page.locator('[data-mol-id="dashboard-arrivals"]')),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="dashboard-departures"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="dashboard-recent-calls"]')).toBeVisible()
  })
})
