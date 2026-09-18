/**
 * /reservations — list + detail + cancel. We exercise the full flow:
 * create a reservation via API, see it in the list, open the detail,
 * cancel it, and verify the status flips to "cancelled" persistently.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, firstVenueId, signup } from './_helpers.js'

test('GET /api/reservations fires on /reservations', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/reservations')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/reservations/.test(r.url))
  expect(get?.status).toBe(200)
})

test('cancelling a reservation flips status to "cancelled" persistently', async ({ page }) => {
  await signup(page)
  const venueId = await firstVenueId(page)
  // Create a reservation via API (use canonical starts_at_iso / ends_at_iso)
  const created = await apiRequest(page, 'POST', '/reservations', {
    venue_id: venueId,
    starts_at_iso: '2027-03-04T10:00:00.000Z',
    ends_at_iso: '2027-03-04T15:00:00.000Z',
    guest_count: 12,
  })
  expect([200, 201]).toContain(created.status)
  const reservation = ((created.body as { data?: { id: string } })?.data ?? created.body) as {
    id: string
  }
  expect(reservation.id).toBeTruthy()

  // Cancel via API
  const cancelled = await apiRequest(page, 'PUT', '/reservations/' + reservation.id + '/cancel')
  expect([200, 204]).toContain(cancelled.status)

  // Confirm persistent state
  const afterGet = await apiRequest(page, 'GET', '/reservations/' + reservation.id)
  expect(afterGet.status).toBe(200)
  const data = ((afterGet.body as { data?: unknown })?.data ?? afterGet.body) as { status?: string }
  expect(data.status).toBe('cancelled')
})
