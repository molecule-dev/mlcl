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

// Same room every time, and the API refuses an overlapping stay (409), so a
// fixed window let only the first test in the file book. Walk it forward.
// Band 300+ keeps clear of the other spec files' hand-partitioned offsets.
// The runner is fullyParallel: every WORKER gets a fresh module instance, so
// the module counter restarted from 300 in each worker and two workers booked
// the identical window. Offset the band per worker (512 apart — far beyond any
// file's test count, so the 200/300 per-file bases stay distinct under the
// same offset). A per-run base (minute-scaled, like travel-booking's
// uniqueStayWindow) shifts the whole band on every run so repeated suites
// against a DB that was NOT reset in between never re-fill the same windows —
// reservations persist, and an overlapping stay is a 409.
const WORKER_BASE = Number(process.env.TEST_WORKER_INDEX ?? '0') * 512
const RUN_BASE = (Math.floor(Date.now() / 60_000) % 1024) * 4
let nextCheckIn = 300 + WORKER_BASE + RUN_BASE
async function createReservation(page: import('@playwright/test').Page) {
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
      guests: 1,
    },
  )
  if (r.status !== 201 && r.status !== 200) {
    throw new Error('createReservation failed: ' + r.status + ' body=' + JSON.stringify(r.body))
  }
  return r.body
}

test.describe('/trips/:id (TripDetail)', () => {
  test('renders the property name as the level-1 heading', async ({ page }) => {
    await signup(page)
    const trip = await createReservation(page)
    await page.goto(APP_BASE + '/trips/' + trip.id, { waitUntil: 'domcontentloaded' })
    const props = await listProperties(page)
    await expect(
      page.getByRole('heading', { level: 1, name: new RegExp(props[0].name.split(' ')[0], 'i') }),
    ).toBeVisible()
  })

  test('"Back to trips" link returns to /trips', async ({ page }) => {
    await signup(page)
    const trip = await createReservation(page)
    await page.goto(APP_BASE + '/trips/' + trip.id, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /Back to trips/i }).click()
    await expect(page).toHaveURL(/\/trips$/)
  })

  test('confirmation number is rendered in the detail block', async ({ page }) => {
    await signup(page)
    const trip = await createReservation(page)
    await page.goto(APP_BASE + '/trips/' + trip.id, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Confirmation:\s+\w+/i)).toBeVisible()
  })

  test('"View property" link navigates to /property/:id', async ({ page }) => {
    await signup(page)
    const trip = await createReservation(page)
    await page.goto(APP_BASE + '/trips/' + trip.id, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /View property/i }).click()
    await expect(page).toHaveURL(/\/property\//)
  })

  test('Cancel booking flips status to cancelled and persists across reload', async ({ page }) => {
    await signup(page)
    const trip = await createReservation(page)
    await page.goto(APP_BASE + '/trips/' + trip.id, { waitUntil: 'domcontentloaded' })

    // ConfirmButton arm/commit: the first click ARMS (no native dialog anymore),
    // the armed confirm label appears, the second click commits the cancellation.
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Cancel booking/i }).click()
      const armed = page.getByRole('button', { name: /Cancel this booking/i })
      await expect(armed).toBeVisible()
      await armed.click()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.includes('/api/trips/' + trip.id + '/cancel') && r.method === 'PUT'),
      'PUT /api/trips/:id/cancel must be observed',
    ).toBeTruthy()

    const refreshed = await apiRequest<{ status: string }>(page, 'GET', '/api/trips/' + trip.id)
    expect(refreshed.body.status).toBe('cancelled')
  })
})
