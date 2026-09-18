import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiGet, apiPost, captureNetwork, signupAndCreateTrip } from './_helpers'

// 99-user-journey: a real user signs up, plans a trip, books a flight,
// records an expense, invites a collaborator, and views the calendar.
// Covers the cross-page path that individual specs miss.

test('user-journey — signup → trip → activity → booking → expense → notification → reload', async ({
  page,
}) => {
  // Signup + create trip
  const { tripId, token } = await signupAndCreateTrip(page, {
    name: 'User Journey Loop',
    destination: 'Reykjavik',
    country: 'Iceland',
  })

  // Trip detail — add an activity
  await page.goto(APP_BASE + '/trips/' + tripId)
  await page.locator('[data-testid="trip-detail-add-activity"]').click()
  await page.locator('[data-testid="trip-detail-add-title"]').fill('Hike Reynisfjara')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-testid="trip-detail-add-submit"]').click()
    await page.waitForTimeout(1500)
  })
  const activity = reqs.find((r) => r.method === 'POST' && /\/api\/activities/.test(r.url))
  expect(activity, 'POST /api/activities must fire').toBeDefined()
  expect(activity!.status).toBeLessThan(400)

  // Booking via API (form covered in bookings.spec)
  const b = await apiPost(page, token, '/bookings', {
    trip_id: tripId,
    kind: 'flight',
    title: 'IcelandAir 105',
    cost_cents: 85_000,
    currency: 'USD',
  })
  expect(b.status).toBeLessThan(400)

  // Expense via API
  const e = await apiPost(page, token, '/expenses', {
    trip_id: tripId,
    category: 'food',
    description: 'Reykjavik dinner',
    amount_cents: 12_500,
    currency: 'USD',
  })
  expect(e.status).toBeLessThan(400)

  // Collaborator invite via API
  const c = await apiPost(page, token, '/collaborators', {
    trip_id: tripId,
    email: 'friend@example.com',
    role: 'editor',
  })
  expect(c.status).toBeLessThan(400)

  // Notification creation via API
  const n = await apiPost(page, token, '/notifications', {
    kind: 'trip_update',
    title: 'Itinerary updated',
    body: 'A new stop was added',
  })
  expect(n.status).toBeLessThan(400)

  // Walk every primary route in the sidebar; each must render without 5xx
  const pages = [
    '/dashboard',
    '/trips',
    '/destinations',
    '/bookings',
    '/expenses',
    '/calendar',
    '/notifications',
    '/settings',
  ]
  for (const path of pages) {
    const r = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + path)
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const failed = r.filter((x) => x.status >= 500)
    expect(failed, `5xx during ${path}: ${JSON.stringify(failed)}`).toEqual([])
  }

  // Read-after-write: trip + bookings + expenses all visible
  const trips = await apiGet<Array<{ id: string }>>(page, token, '/trips')
  expect(trips.body.some((t) => t.id === tripId)).toBe(true)
  const bookings = await apiGet<unknown[]>(page, token, '/bookings')
  expect(JSON.stringify(bookings.body)).toMatch(/IcelandAir/)
  const expenses = await apiGet<unknown[]>(page, token, '/expenses')
  expect(JSON.stringify(expenses.body)).toMatch(/Reykjavik dinner/)

  // Reload trip detail — content survives reload. The h1 prefers trip.name
  // (User Journey Loop) and the destination is shown beneath it. Either
  // proves persistence of the row.
  await page.goto(APP_BASE + '/trips/' + tripId)
  await page.reload()
  await expect(page.locator('[data-testid="trip-detail-name"]')).toContainText(/User Journey Loop/i)
  await expect(page.locator('[data-testid="trip-detail-destination"]')).toContainText(/Reykjavik/i)
})
