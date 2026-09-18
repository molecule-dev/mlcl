/**
 * Kitchen-sink cross-page flow: signup → search → property detail → book →
 * trips list → trip detail → notifications → favorites → account →
 * pricing → settings cancel.
 *
 * The point is to assert that primary navigation works end-to-end without
 * any of the wired backend calls 4xx-ing.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup, uniqueStayWindow } from './_helpers.js'

test('end-to-end user journey: signup → search → book → trip → settings', async ({ page }) => {
  // Sign up
  await signup(page)

  // Search lists properties from /api/accommodations
  let reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/search')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })
  })
  const accReq = reqs.find((r) => r.method === 'GET' && /\/api\/accommodations(\?|$)/.test(r.url))
  expect(accReq?.status).toBe(200)

  // Pick the first property and walk into PropertyDetail
  const accs = await apiRequest(page, 'GET', '/accommodations')
  const accList =
    (accs.body as { data?: Array<{ id: string }> }).data ?? (accs.body as Array<{ id: string }>)
  expect(accList.length).toBeGreaterThan(0)
  const propertyId = accList[0].id

  await page.goto(APP_BASE + `/property/${propertyId}`)
  await page.waitForLoadState('networkidle', { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Open the photo gallery once to confirm it isn't a stub
  await page.locator('[data-testid="property-all-photos"]').click()
  await expect(page.locator('[data-testid="property-gallery-modal"]')).toBeVisible()
  await page.locator('[data-testid="property-gallery-close"]').click()

  // Book directly via the API (the form is exercised in booking__id.spec.ts)
  const rooms = await apiRequest(page, 'GET', `/accommodations/${propertyId}/rooms`)
  const roomList =
    (rooms.body as { data?: Array<{ id: string }> }).data ?? (rooms.body as Array<{ id: string }>)
  const roomId = roomList[0].id
  // This booked the same room + same hard-coded window as every test in
  // trips__id.spec.ts, so it consumed one of that room's 4 inventory units and
  // pushed the trip-detail tests into a 409. Take an exclusive window instead.
  const { checkIn, checkOut } = uniqueStayWindow()
  const booking = await apiRequest(page, 'POST', '/bookings', {
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
  })
  expect([200, 201]).toContain(booking.status)
  const tripId =
    (booking.body as { data?: { id: string } } | { id: string }).data?.id ??
    (booking.body as { id: string }).id
  expect(tripId).toBeTruthy()

  // Trips list shows the new booking
  await page.goto(APP_BASE + '/trips')
  await page.waitForLoadState('networkidle', { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /^Trips$/i })).toBeVisible()

  // Trip detail renders
  await page.goto(APP_BASE + `/trips/${tripId}`)
  await page.waitForLoadState('networkidle', { timeout: 20_000 })
  await expect(page.locator('[data-testid="trip-detail-hero"]')).toBeVisible()

  // Notifications page loads
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle', { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible()

  // Favorites page loads
  await page.goto(APP_BASE + '/favorites')
  await page.waitForLoadState('networkidle', { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /Saved properties/i })).toBeVisible()

  // Account loads + GET /api/profile/me succeeded
  reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/account')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })
  })
  const profileReq = reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me/.test(r.url))
  expect(profileReq?.status).toBe(200)

  // Pricing page renders for an authed user too
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('heading', { name: /Choose your.*plan/i })).toBeVisible()

  // Direct API check: billing/status reachable for the current user
  const billing = await apiRequest(page, 'GET', '/billing/status')
  expect([200, 204]).toContain(billing.status)

  // Destinations and itineraries listing endpoints are wired and reachable.
  const dests = await apiRequest(page, 'GET', '/destinations')
  expect([200, 204]).toContain(dests.status)
  const itins = await apiRequest(page, 'GET', '/itineraries')
  expect([200, 204]).toContain(itins.status)
})
