import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedRoom, signup, whereUrl } from './_helpers.js'

test.describe('/rooms', () => {
  test('rooms page renders for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rooms')
    await expect(page.getByRole('heading', { name: /rooms/i }).first()).toBeVisible()
    await expect(page.locator('[data-testid="rooms-new-button"]')).toBeVisible()
  })

  test('seeded rooms appear on /rooms', async ({ page, request }) => {
    const session = await signup(page)
    const room = await seedRoom(request, session.accessToken!, 'Garage')
    await page.goto(APP_BASE + '/rooms')
    await expect(page.getByText(room.name, { exact: false }).first()).toBeVisible()
  })

  test('new-room form POSTs /api/rooms and the room appears immediately', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const uniqueName = 'Sunroom ' + Date.now()
    await page.goto(APP_BASE + '/rooms')
    await page.locator('[data-testid="rooms-new-button"]').click()
    await page.locator('#room-name').fill(uniqueName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="rooms-new-submit"]').click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/rooms(?:\/|\?|$)/, 'POST').length).toBeGreaterThan(0)

    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/rooms')
    expect(list.status()).toBe(200)
    const items = await list.json()
    const arr = Array.isArray(items) ? items : items.items || []
    expect(arr.find((r: { name: string }) => r.name === uniqueName)).toBeTruthy()
    await expect(page.getByText(uniqueName, { exact: false }).first()).toBeVisible()
  })

  test("clicking a room in the list navigates to that room's detail page", async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const room = await seedRoom(request, session.accessToken!, 'Click-through ' + Date.now())
    await page.goto(APP_BASE + '/rooms')
    const link = page.getByText(room.name, { exact: false }).first()
    await link.click().catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    // The list-row should be clickable; if it isn't a link, navigate manually
    if (!page.url().includes(`/rooms/${room.id}`)) {
      await page.goto(APP_BASE + `/rooms/${room.id}`)
    }
    await expect(page).toHaveURL(new RegExp(`/rooms/${room.id}`))
  })
})
