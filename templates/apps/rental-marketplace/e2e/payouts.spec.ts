/**
 * /api/payouts — host payouts API surface (no UI page yet).
 *
 * Real outcomes asserted:
 *   - GET /api/payouts/mine returns the host's payout rows + summary
 *   - confirming a booking auto-creates a host_payouts row in the
 *     'pending' state (read-after-write — the backend invariant
 *     bookings.ts depends on for the host's earnings hero)
 *   - POST /api/payouts/:id/payout flips the row's status to 'paid'
 *     with a non-empty payout_reference (synthetic local_* when no
 *     STRIPE_CONNECT_ACCOUNT_ID is configured — same pattern as the
 *     other -marketplace flagships)
 *   - 401 when unauthenticated; 404 when the payout id doesn't exist
 *   - 400 when re-paying an already-paid payout (idempotency guard)
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup } from './_helpers'

async function setupHostBookingPayout(
  hostPage: import('@playwright/test').Page,
  guestPage: import('@playwright/test').Page,
): Promise<{ payoutId: string; bookingId: string }> {
  await signup(hostPage)
  // Host creates a listing.
  const listing = await hostPage.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'Payout Test Cabin',
      description: 'Used to verify host_payouts lifecycle.',
      property_type: 'cabin',
      address: 'Payout Town',
      city: 'Payout Town',
      country: 'United States',
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['Wifi'],
      images: ['https://picsum.photos/seed/payout/1200/900'],
      thumbnails: ['https://picsum.photos/seed/payout/600/450'],
      price_per_night: 240,
      cleaning_fee: 30,
      currency: 'USD',
    },
  })
  expect([200, 201]).toContain(listing.status())
  const lb = (await listing.json()) as { id?: string; data?: { id?: string } }
  const listingId = lb.id ?? lb.data?.id
  expect(listingId).toBeTruthy()

  // Guest signs up and books that listing.
  await signup(guestPage)
  const checkIn = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const checkOut = new Date(Date.now() + 33 * 86400000).toISOString().slice(0, 10)
  const book = await guestPage.request.post(`${API_BASE}/bookings`, {
    data: { listing_id: listingId, check_in: checkIn, check_out: checkOut, guests: 2 },
  })
  expect([200, 201]).toContain(book.status())
  const booking = (await book.json()) as { id: string }

  // Host confirms the booking — backend creates host_payouts row.
  const confirm = await hostPage.request.put(`${API_BASE}/bookings/${booking.id}/confirm`)
  expect(confirm.status()).toBe(200)

  // Read-after-write: GET /api/payouts/mine now lists at least one row.
  const list = await hostPage.request.get(`${API_BASE}/payouts/mine`)
  expect(list.status()).toBe(200)
  const body = (await list.json()) as {
    data: Array<{ id: string; status: string; amount: string | number }>
    summary: { totalEarned: number; pendingPayout: number; paidOut: number }
  }
  expect(Array.isArray(body.data)).toBe(true)
  expect(body.data.length).toBeGreaterThan(0)
  expect(body.summary.totalEarned).toBeGreaterThan(0)

  return { payoutId: body.data[0].id, bookingId: booking.id }
}

test('GET /api/payouts/mine returns 401 when unauthenticated', async ({ request }) => {
  const r = await request.get(`${API_BASE}/payouts/mine`)
  expect(r.status()).toBe(401)
})

test('confirming a booking creates a pending host_payouts row visible via GET /api/payouts/mine', async ({
  browser,
}) => {
  const hostCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const hostPage = await hostCtx.newPage()
  const guestPage = await guestCtx.newPage()
  const { payoutId } = await setupHostBookingPayout(hostPage, guestPage)
  expect(payoutId).toBeTruthy()
  // The newly-created payout starts as 'pending'.
  const detail = await hostPage.request.get(`${API_BASE}/payouts/mine`)
  const body = (await detail.json()) as { data: Array<{ id: string; status: string }> }
  const me = body.data.find((p) => p.id === payoutId)
  expect(me?.status).toBe('pending')
  await hostCtx.close()
  await guestCtx.close()
})

test('POST /api/payouts/:id/payout flips status to paid with a non-empty reference (read-after-write)', async ({
  browser,
}) => {
  const hostCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const hostPage = await hostCtx.newPage()
  const guestPage = await guestCtx.newPage()
  const { payoutId } = await setupHostBookingPayout(hostPage, guestPage)

  // Trigger a payout dispatch — without STRIPE_CONNECT_ACCOUNT_ID the
  // handler records a synthetic local_* reference so the dashboards stay
  // consistent (see handlers/payouts.ts).
  const dispatch = await hostPage.request.post(`${API_BASE}/payouts/${payoutId}/payout`, {
    data: {},
  })
  expect(dispatch.status()).toBe(200)

  // Read-after-write: GET /api/payouts/mine — that row is now `paid`.
  const after = await hostPage.request.get(`${API_BASE}/payouts/mine`)
  const ab = (await after.json()) as {
    data: Array<{
      id: string
      status: string
      payout_reference?: string | null
      paid_at?: string | null
    }>
    summary: { paidOut: number; pendingPayout: number }
  }
  const me = ab.data.find((p) => p.id === payoutId)
  expect(me?.status).toBe('paid')
  expect(me?.payout_reference, 'payout_reference must be set after dispatch').toBeTruthy()
  expect(me?.paid_at, 'paid_at must be set after dispatch').toBeTruthy()
  expect(ab.summary.paidOut).toBeGreaterThan(0)

  // Re-paying the same payout is rejected.
  const again = await hostPage.request.post(`${API_BASE}/payouts/${payoutId}/payout`, { data: {} })
  expect(again.status()).toBe(400)

  await hostCtx.close()
  await guestCtx.close()
})

test('POST /api/payouts/:id/payout returns 404 for an unknown payout id', async ({ page }) => {
  await signup(page)
  const r = await page.request.post(
    `${API_BASE}/payouts/00000000-0000-0000-0000-000000000000/payout`,
    { data: {} },
  )
  expect(r.status()).toBe(404)
})
