/**
 * /trips/:id: TripDetail page. Resolves a real trip id by booking a
 * trip end-to-end via Booking, then drives the message-host + cancel flows.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup, uniqueStayWindow } from './_helpers.js'

async function bookFirstTripGetId(page: import('@playwright/test').Page): Promise<string> {
  await signup(page)
  const accs = await apiRequest(page, 'GET', '/accommodations')
  const accList =
    (accs.body as { data?: Array<{ id: string }> }).data ?? (accs.body as Array<{ id: string }>)
  const propertyId = accList[0].id
  const rooms = await apiRequest(page, 'GET', `/accommodations/${propertyId}/rooms`)
  const roomList =
    (rooms.body as { data?: Array<{ id: string }> }).data ?? (rooms.body as Array<{ id: string }>)
  const roomId = roomList[0].id
  // Every test in this file books the same first room, and the API caps
  // overlapping active bookings at that room's `total_rooms` (4) — a shared
  // hard-coded window made the 5th test onward fail here with a 409. Each test
  // takes its own nights instead; see uniqueStayWindow() in ./_helpers.ts.
  const { checkIn, checkOut } = uniqueStayWindow()
  const booking = await apiRequest(page, 'POST', '/bookings', {
    room_id: roomId,
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
  })
  expect([200, 201]).toContain(booking.status)
  const id =
    (booking.body as { data?: { id: string } } | { id: string }).data?.id ??
    (booking.body as { id: string }).id
  expect(id).toBeTruthy()
  return id
}

test('back-to-trips link navigates to /trips', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.getByRole('link', { name: /Back to trips/i }).click()
  await expect(page).toHaveURL(/\/trips$/)
})

test('trip hero renders + GET /api/trips/:id fires', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/trips/${id}`)
    await expect(page.locator('[data-testid="trip-detail-hero"]')).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const tripGet = reqs.find((r) => r.method === 'GET' && new RegExp(`/api/trips/${id}`).test(r.url))
  expect(tripGet?.status).toBe(200)
})

test('status pill is visible', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.locator('[data-testid="trip-status-badge"]')).toBeVisible()
})

test('Message host button opens the modal with the textarea', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="trip-message-host"]').click()
  await expect(page.locator('[data-testid="trip-message-input"]')).toBeVisible()
})

test('host-message textarea accepts text', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="trip-message-host"]').click()
  await page.locator('[data-testid="trip-message-input"]').fill('Arriving at 8pm')
  await expect(page.locator('[data-testid="trip-message-input"]')).toHaveValue('Arriving at 8pm')
})

test('sending a host message increments host_message_count on next read', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  const before = await apiRequest(page, 'GET', `/trips/${id}`)
  const beforeBody = before.body as
    { data?: { host_message_count?: number } } | { host_message_count?: number }
  const beforeCount =
    (beforeBody as { data?: { host_message_count?: number } }).data?.host_message_count ??
    (beforeBody as { host_message_count?: number }).host_message_count ??
    0
  const post = await apiRequest(page, 'POST', `/trips/${id}/host-message`, {
    message: 'Arriving 4pm — tortillas appreciated',
  })
  expect([200, 201]).toContain(post.status)
  const after = await apiRequest(page, 'GET', `/trips/${id}`)
  const afterBody = after.body as
    { data?: { host_message_count?: number } } | { host_message_count?: number }
  const afterCount =
    (afterBody as { data?: { host_message_count?: number } }).data?.host_message_count ??
    (afterBody as { host_message_count?: number }).host_message_count ??
    0
  expect(afterCount).toBe(beforeCount + 1)
})

test('Itinerary section heading is visible', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /Itinerary/i })).toBeVisible()
})

test('Price summary section heading is visible', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /Price summary/i })).toBeVisible()
})

test('total amount renders', async ({ page }) => {
  const id = await bookFirstTripGetId(page)
  await page.goto(APP_BASE + `/trips/${id}`)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.locator('[data-testid="trip-total"]')).toBeVisible()
})
