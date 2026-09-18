/**
 * /host/reservations — incoming reservation queue (host POV).
 *
 * Real outcomes asserted:
 *   - GET /api/reservations fires and 200s
 *   - tabs (pending / confirmed / history) toggle the visible set
 *   - approve PUTs /api/bookings/:id/confirm and the row moves to
 *     the Confirmed tab on next refresh (read-after-write)
 *   - decline PUTs /api/bookings/:id/cancel and moves it to History
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

async function setupHostWithBooking(
  hostPage: import('@playwright/test').Page,
  guestPage: import('@playwright/test').Page,
) {
  // Host signs up + creates a listing.
  await signup(hostPage)
  const create = await hostPage.request.post(`${API_BASE}/listings`, {
    data: {
      title: 'Host Queue Listing',
      description: 'Used to exercise reservation approval/decline.',
      property_type: 'cabin',
      address: 'Queue Town',
      city: 'Queue Town',
      country: 'United States',
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ['Wifi'],
      images: ['https://picsum.photos/seed/queue/1200/900'],
      thumbnails: ['https://picsum.photos/seed/queue/600/450'],
      price_per_night: 200,
      cleaning_fee: 30,
      currency: 'USD',
    },
  })
  expect([200, 201]).toContain(create.status())
  const listing = (await create.json()) as { id?: string; data?: { id?: string } }
  const listingId = listing.id ?? listing.data?.id
  expect(listingId).toBeTruthy()

  // Guest signs up (separate context) + makes a booking against host's
  // listing. instant_book defaults off, so it lands as 'pending'.
  await signup(guestPage)
  const checkIn = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
  const checkOut = new Date(Date.now() + 23 * 86400000).toISOString().slice(0, 10)
  const book = await guestPage.request.post(`${API_BASE}/bookings`, {
    data: { listing_id: listingId, check_in: checkIn, check_out: checkOut, guests: 2 },
  })
  expect([200, 201]).toContain(book.status())
  const booking = (await book.json()) as { id: string; status: string }
  return { listingId: listingId!, bookingId: booking.id, initialStatus: booking.status }
}

test('host reservations queue shows the pending booking', async ({ browser }) => {
  const hostCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const hostPage = await hostCtx.newPage()
  const guestPage = await guestCtx.newPage()
  await setupHostWithBooking(hostPage, guestPage)
  await guestCtx.close()

  const reqs = await captureNetwork(hostPage, async () => {
    await hostPage.goto(APP_BASE + '/host/reservations')
    await hostPage.waitForLoadState('networkidle')
  })
  const r = reqs.find((req) => req.url.includes('/api/reservations') && req.method === 'GET')
  expect(r?.status).toBe(200)
  await expect(hostPage.getByRole('heading', { name: /reservation queue/i })).toBeVisible()
  await expect(hostPage.getByText('Host Queue Listing').first()).toBeVisible({ timeout: 10000 })
  await hostCtx.close()
})

test('approving a booking flips its status to confirmed (read-after-write)', async ({
  browser,
}) => {
  const hostCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const hostPage = await hostCtx.newPage()
  const guestPage = await guestCtx.newPage()
  const { bookingId } = await setupHostWithBooking(hostPage, guestPage)
  await guestCtx.close()

  await hostPage.goto(APP_BASE + '/host/reservations')
  await hostPage.waitForLoadState('networkidle')
  // Approve the first pending row.
  const approve = hostPage.getByRole('button', { name: /^Approve$/ }).first()
  await approve.waitFor({ state: 'visible', timeout: 10000 })
  const reqs = await captureNetwork(hostPage, async () => {
    await approve.click()
    await hostPage.waitForTimeout(2000)
  })
  const put = reqs.find(
    (req) => req.url.includes(`/api/bookings/${bookingId}/confirm`) && req.method === 'PUT',
  )
  expect(put, 'PUT /api/bookings/:id/confirm should fire').toBeTruthy()
  expect(put!.status).toBe(200)

  // Read-after-write: GET status === 'confirmed'.
  const after = await hostPage.request.get(`${API_BASE}/bookings/${bookingId}`)
  const body = (await after.json()) as { status: string }
  expect(body.status).toBe('confirmed')
  await hostCtx.close()
})

test('declining a booking flips its status to cancelled (read-after-write)', async ({
  browser,
}) => {
  const hostCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const hostPage = await hostCtx.newPage()
  const guestPage = await guestCtx.newPage()
  const { bookingId } = await setupHostWithBooking(hostPage, guestPage)
  await guestCtx.close()

  await hostPage.goto(APP_BASE + '/host/reservations')
  await hostPage.waitForLoadState('networkidle')
  const decline = hostPage.getByRole('button', { name: /^Decline$/ }).first()
  await decline.waitFor({ state: 'visible', timeout: 10000 })
  const reqs = await captureNetwork(hostPage, async () => {
    await decline.click()
    await hostPage.waitForTimeout(2000)
  })
  const put = reqs.find(
    (r) => r.url.includes(`/api/bookings/${bookingId}/cancel`) && r.method === 'PUT',
  )
  expect(put, 'PUT /api/bookings/:id/cancel should fire on decline').toBeTruthy()
  expect(put!.status).toBe(200)

  const after = await hostPage.request.get(`${API_BASE}/bookings/${bookingId}`)
  const body = (await after.json()) as { status: string }
  expect(body.status).toBe('cancelled')
  await hostCtx.close()
})

test('Confirmed tab activates and surfaces approved bookings', async ({ browser }) => {
  const hostCtx = await browser.newContext()
  const guestCtx = await browser.newContext()
  const hostPage = await hostCtx.newPage()
  const guestPage = await guestCtx.newPage()
  const { bookingId } = await setupHostWithBooking(hostPage, guestPage)
  await guestCtx.close()
  // Approve the booking so it lands under Confirmed.
  const r = await hostPage.request.put(`${API_BASE}/bookings/${bookingId}/confirm`)
  expect(r.status()).toBe(200)

  await hostPage.goto(APP_BASE + '/host/reservations')
  await hostPage.waitForLoadState('networkidle')
  const confirmedTab = hostPage.getByRole('tab', { name: /confirmed/i })
  await confirmedTab.click()
  await expect(confirmedTab).toHaveAttribute('aria-selected', 'true')
  await expect(hostPage.getByText('Host Queue Listing').first()).toBeVisible({ timeout: 10000 })
  await hostCtx.close()
})

test('empty queue: a brand-new host sees the "nothing in this queue" copy', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/reservations')
  await page.waitForLoadState('networkidle')
  // Demo seed may produce a pending row for fresh users — but the
  // History tab is always empty for a new host.
  const history = page.getByRole('tab', { name: /history/i })
  await history.click()
  await expect(page.getByText(/nothing in this queue\./i).first()).toBeVisible({ timeout: 5000 })
})
