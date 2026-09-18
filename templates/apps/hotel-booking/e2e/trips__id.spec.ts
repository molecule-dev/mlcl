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
let nextCheckIn = 300
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
    page.on('dialog', (dialog) => dialog.accept())

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Cancel booking/i }).click()
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
