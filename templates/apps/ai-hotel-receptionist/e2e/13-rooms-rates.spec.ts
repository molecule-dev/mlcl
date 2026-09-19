import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/rooms', () => {
  test('renders the room-type table and the room board from the API', async ({ page }) => {
    await signup(page)
    const payload = await page.evaluate(async () => {
      const [types, rooms, plans] = await Promise.all([
        fetch('/api/room-types', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/rooms', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/rate-plans', { credentials: 'include' }).then((r) => r.json()),
      ])
      return {
        types: (types as { data: unknown[] }).data,
        rooms: (rooms as { data: Array<{ number: string }> }).data,
        plans: (plans as { data: unknown[] }).data,
      }
    })
    expect(payload.types.length, 'room types must be seeded').toBeGreaterThan(0)
    expect(payload.rooms.length, 'rooms must be seeded').toBeGreaterThan(0)
    expect(payload.plans.length, 'rate plans must be seeded').toBeGreaterThan(0)

    await page.goto(APP_BASE + '/rooms')
    await expect(page.getByRole('heading', { name: /Rooms & Rates/i })).toBeVisible({
      timeout: 15_000,
    })
    for (const room of payload.rooms) {
      await expect(page.locator('[data-mol-id="room-row-' + room.number + '"]')).toBeVisible({
        timeout: 15_000,
      })
    }
  })

  test('changing a room status from the board persists via PATCH /api/rooms/:id', async ({
    page,
  }) => {
    await signup(page)
    const room = await page.evaluate(async () => {
      const resp = await fetch('/api/rooms', { credentials: 'include' })
      const body = (await resp.json()) as {
        data: Array<{ id: string; number: string; status: string }>
      }
      // Pick a room whose status we can flip without disturbing occupancy math.
      return body.data.find((r) => r.status === 'vacant_clean') ?? body.data[0]!
    })
    await page.goto(APP_BASE + '/rooms')
    const select = page.locator('[data-mol-id="room-status-' + room.number + '"]')
    await expect(select).toBeVisible({ timeout: 15_000 })
    const nextStatus = room.status === 'cleaning' ? 'vacant_clean' : 'cleaning'
    const patch = page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' && new RegExp('/api/rooms/' + room.id + '$').test(r.url()),
      { timeout: 15_000 },
    )
    await select.selectOption(nextStatus)
    const resp = await patch
    expect(resp.status(), 'PATCH /api/rooms/:id should be 2xx').toBeLessThan(300)
    await expect(select).toHaveValue(nextStatus)
  })

  test('rate plans section renders one card per plan from the API', async ({ page }) => {
    await signup(page)
    const plans = await page.evaluate(async () => {
      const resp = await fetch('/api/rate-plans', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string }> }
      return body.data
    })
    await page.goto(APP_BASE + '/rooms')
    await expect(page.getByRole('heading', { name: 'Rate plans' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id^="rate-plan-"]')).toHaveCount(plans.length, {
      timeout: 15_000,
    })
  })
})
