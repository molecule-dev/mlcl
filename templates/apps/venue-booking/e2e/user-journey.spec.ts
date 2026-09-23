/**
 * Full user journey — sign up → browse → favorite → message → reserve →
 * cancel. One test covers the canonical real-world flow with outcome
 * assertions at each step.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, firstVenueId, signup } from './_helpers.js'

test('end-to-end: signup → browse → favorite → message → reserve → cancel', async ({ page }) => {
  await signup(page)

  // 1. Browse
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/\/(hr|day)\b/).first()).toBeVisible()

  // 2. Pick a venue
  const venueId = await firstVenueId(page)

  // 3. Favorite it
  const fav = await apiRequest(page, 'POST', '/favorites', { venue_id: venueId })
  expect([200, 201]).toContain(fav.status)
  const after = await apiRequest(page, 'GET', '/favorites')
  const favList = (after.body as { data?: { venue_id: string }[] })?.data ?? []
  expect(favList.some((f) => f.venue_id === venueId)).toBe(true)

  // 4. Open a message thread with the host
  const thread = await apiRequest(page, 'POST', '/messages', { venue_id: venueId })
  expect([200, 201]).toContain(thread.status)
  // The endpoint returns { thread, messages } — pull the thread id out.
  const threadId =
    (thread.body as { thread?: { id?: string }; data?: { id?: string }; id?: string }).thread?.id ??
    (thread.body as { data?: { id?: string } }).data?.id ??
    (thread.body as { id?: string }).id
  expect(threadId).toBeTruthy()

  // 5. Reserve the venue (use canonical starts_at_iso / ends_at_iso shape)
  const created = await apiRequest(page, 'POST', '/reservations', {
    venue_id: venueId,
    starts_at_iso: '2027-04-12T10:00:00.000Z',
    ends_at_iso: '2027-04-12T15:00:00.000Z',
    guest_count: 8,
  })
  expect([200, 201]).toContain(created.status)
  const r = ((created.body as { data?: { id: string } })?.data ?? created.body) as { id: string }
  expect(r.id).toBeTruthy()

  // 6. Cancel
  const cancel = await apiRequest(page, 'PUT', '/reservations/' + r.id + '/cancel')
  expect([200, 204]).toContain(cancel.status)
  const refetched = await apiRequest(page, 'GET', '/reservations/' + r.id)
  const data = ((refetched.body as { data?: unknown })?.data ?? refetched.body) as {
    status?: string
  }
  expect(data.status).toBe('cancelled')
})

test('user isolation — A’s reservations never leak to B', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const a = await ctxA.newPage()
  await signup(a)

  const ctxB = await browser.newContext()
  const b = await ctxB.newPage()
  await signup(b)

  // user A creates a reservation. The window is unique per run: a fixed
  // slot double-books against earlier runs' confirmed bookings (409, no
  // id in the response) and the rest of the test degenerates.
  const venueId = await firstVenueId(a)
  const start = new Date(Date.now() + 90 * 24 * 3600 * 1000)
  const end = new Date(start.getTime() + 5 * 60 * 1000)
  const r = await apiRequest(a, 'POST', '/reservations', {
    venue_id: venueId,
    starts_at_iso: start.toISOString(),
    ends_at_iso: end.toISOString(),
    guest_count: 4,
  })
  expect([200, 201]).toContain(r.status)
  const created = ((r.body as { data?: { id: string } })?.data ?? r.body) as { id: string }
  expect(created.id, 'reservation created (got id)').toBeTruthy()

  // user B's reservations should not include A's
  const listB = await apiRequest(b, 'GET', '/reservations')
  const reservationsB = (listB.body as { data?: { id?: string }[] })?.data ?? []
  expect(reservationsB.some((res) => res.id === created.id)).toBe(false)

  // user B cannot fetch A's reservation by id either
  const probe = await apiRequest(b, 'GET', '/reservations/' + created.id)
  expect([403, 404]).toContain(probe.status)

  // cleanup: free the venue slot so reruns don't collide
  await apiRequest(a, 'PUT', '/reservations/' + created.id + '/cancel')

  await ctxA.close()
  await ctxB.close()
})
