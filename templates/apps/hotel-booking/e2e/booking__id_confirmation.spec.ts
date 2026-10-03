import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  captureNetwork,
  isoOffset,
  listProperties,
  listRooms,
  signup,
} from './_helpers.js'

// Every test in this file books the same room, and the API correctly refuses an
// overlapping stay (409 "That room is already booked for the selected dates").
// With a fixed 80→83 window only the first booking could succeed and the rest of
// the file failed on setup. Walk the window forward per call instead. The band
// starts at 200 because the other spec files hand-partition offsets below 100
// (booking 30-62, trips 95-98, property 15-25) against the same seeded rooms.
// The runner is fullyParallel: every WORKER gets a fresh module instance, so a
// bare module counter restarted from 200 in each worker and two workers booked
// the identical window. Offset the band per worker (512 apart — far beyond any
// file's test count, so the 200/300 per-file bases stay distinct under the same
// offset). A per-run base (minute-scaled, like travel-booking's
// uniqueStayWindow) shifts the whole band on every run so repeated suites
// against a DB that was NOT reset in between never re-fill the same windows —
// reservations persist, and an overlapping stay is a 409.
const WORKER_BASE = Number(process.env.TEST_WORKER_INDEX ?? '0') * 512
const RUN_BASE = (Math.floor(Date.now() / 60_000) % 1024) * 4
let nextCheckIn = 200 + WORKER_BASE + RUN_BASE
async function createReservationViaApi(page: import('@playwright/test').Page) {
  const properties = await listProperties(page)
  const rooms = await listRooms(page, properties[0].id)
  const checkIn = nextCheckIn
  nextCheckIn += 4
  const r = await apiRequest<{ id: string; confirmation_number?: string; total?: number }>(
    page,
    'POST',
    '/api/reservations',
    {
      room_id: rooms[0].id,
      check_in: isoOffset(checkIn),
      check_out: isoOffset(checkIn + 3),
      guests: 2,
    },
  )
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(
      'createReservationViaApi failed: ' + r.status + ' body=' + JSON.stringify(r.body),
    )
  }
  return r.body
}

test.describe('/booking/:id/confirmation (BookingConfirmation)', () => {
  test('renders the "Booking confirmed" heading', async ({ page }) => {
    await signup(page)
    const created = await createReservationViaApi(page)
    await page.goto(APP_BASE + '/booking/' + created.id + '/confirmation', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByRole('heading', { name: /Booking confirmed/i, level: 1 })).toBeVisible()
  })

  test('shows the confirmation number from the trip API', async ({ page }) => {
    await signup(page)
    const created = await createReservationViaApi(page)
    await page.goto(APP_BASE + '/booking/' + created.id + '/confirmation', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByTestId('confirmation-number')).toContainText(
      created.confirmation_number ?? created.id,
    )
  })

  test('"View trip" link navigates to /trips/:id for this reservation', async ({ page }) => {
    await signup(page)
    const created = await createReservationViaApi(page)
    await page.goto(APP_BASE + '/booking/' + created.id + '/confirmation', {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('link', { name: /View trip/i }).click()
    await expect(page).toHaveURL(new RegExp('/trips/' + created.id))
  })

  test('"All trips" link navigates to /trips', async ({ page }) => {
    await signup(page)
    const created = await createReservationViaApi(page)
    await page.goto(APP_BASE + '/booking/' + created.id + '/confirmation', {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('link', { name: /All trips/i }).click()
    await expect(page).toHaveURL(/\/trips$/)
  })

  test('"Browse more stays" link navigates to /search', async ({ page }) => {
    await signup(page)
    const created = await createReservationViaApi(page)
    await page.goto(APP_BASE + '/booking/' + created.id + '/confirmation', {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('link', { name: /Browse more stays/i }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('observes GET /api/trips/:id (network)', async ({ page }) => {
    await signup(page)
    const created = await createReservationViaApi(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/booking/' + created.id + '/confirmation', {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.includes('/api/trips/' + created.id) && r.method === 'GET'),
      'GET /api/trips/:id must be observed',
    ).toBeTruthy()
  })
})
