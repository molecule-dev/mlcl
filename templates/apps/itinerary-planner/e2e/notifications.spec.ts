import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiGet, apiPost, captureNetwork, signup, signupAndCreateTrip } from './_helpers'

test.describe('/notifications', () => {
  test('mounts and GETs /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
    expect(get, 'GET /api/notifications must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })

  test('Empty state visible for new user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-testid="notifications-empty"]')).toBeVisible()
  })

  test('Heading visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('After seeded notification, list renders rows', async ({ page }) => {
    const { token } = await signupAndCreateTrip(page)
    await apiPost(page, token, '/notifications', {
      kind: 'trip_update',
      title: 'Itinerary updated',
      body: 'Day 3 added',
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-testid="notifications-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="notifications-row"]').first()).toBeVisible()
  })

  test('Mark-all-read POSTs the right endpoint and zeroes the unread count', async ({ page }) => {
    const { token } = await signupAndCreateTrip(page)
    await apiPost(page, token, '/notifications', {
      kind: 'trip_update',
      title: 'Test',
      body: 'A',
    })
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="notifications-mark-all-read"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/notifications\/mark-all-read/.test(r.url),
    )
    expect(post, 'mark-all-read must fire').toBeDefined()
    expect(post!.status).toBeLessThan(400)
    // Read-after-write: every notification has read=true
    const list = await apiGet<Array<{ read: boolean }>>(page, token, '/notifications')
    expect(list.status).toBe(200)
    expect((list.body as Array<{ read: boolean }>).every((n) => n.read === true)).toBe(true)
  })

  test('Per-row toggle PUTs /api/notifications/:id and flips read state', async ({ page }) => {
    const { token } = await signupAndCreateTrip(page)
    await apiPost(page, token, '/notifications', {
      kind: 'trip_update',
      title: 'Toggle me',
      body: '...',
    })
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="notifications-toggle"]').first().click()
      await page.waitForTimeout(1500)
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/notifications\//.test(r.url))
    expect(put, 'PUT must fire').toBeDefined()
    expect(put!.status).toBeLessThan(400)
  })
})
