import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, isoOffset, listProperties, listRooms, signup } from './_helpers.js'

test.describe('booking flow (creates a real reservation)', () => {
  test('POST /api/reservations persists across reloads and appears in /api/trips', async ({
    page,
  }) => {
    await signup(page)
    const properties = await listProperties(page)
    const property = properties[0]
    const rooms = await listRooms(page, property.id)
    const room = rooms[0]
    const checkIn = isoOffset(30)
    const checkOut = isoOffset(33)

    const created = await page.request.post(API_BASE + '/reservations', {
      data: { room_id: room.id, check_in: checkIn, check_out: checkOut, guests: 2 },
    })
    expect(created.status()).toBe(201)
    const reservation = (await created.json()) as {
      id: string
      total: number
      confirmation_number: string
      nights: number
    }
    expect(reservation.id).toBeTruthy()
    expect(reservation.confirmation_number).toBeTruthy()
    expect(reservation.nights).toBe(3)
    expect(reservation.total).toBeGreaterThan(0)

    // Read-after-write — list endpoint should now include this reservation.
    const tripsRes = await page.request.get(API_BASE + '/trips')
    const trips = (await tripsRes.json()) as {
      data: Array<{ id: string; property_id: string; total_cents: number }>
    }
    const found = trips.data.find((t) => t.id === reservation.id)
    expect(found, 'newly created reservation must appear in /api/trips').toBeTruthy()
    expect(found?.property_id).toBe(property.id)
    expect(found?.total_cents).toBe(reservation.total)
  })

  test('reservation rejects check_out <= check_in', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    const rooms = await listRooms(page, properties[0].id)
    const checkIn = isoOffset(30)
    const checkOut = isoOffset(30)
    const res = await page.request.post(API_BASE + '/reservations', {
      data: { room_id: rooms[0].id, check_in: checkIn, check_out: checkOut, guests: 2 },
    })
    expect(res.status()).toBe(400)
  })

  test('first reservation kicks demo seed (loyalty becomes silver, notifications appear)', async ({
    page,
  }) => {
    await signup(page)
    const properties = await listProperties(page)
    const rooms = await listRooms(page, properties[0].id)
    await page.request.post(API_BASE + '/reservations', {
      data: { room_id: rooms[0].id, check_in: isoOffset(40), check_out: isoOffset(43), guests: 2 },
    })
    // Allow the fire-and-forget seed to finish.
    await page.waitForTimeout(500)
    const loyaltyRes = await page.request.get(API_BASE + '/loyalty/me')
    const loyalty = await loyaltyRes.json()
    expect(['silver', 'gold', 'platinum']).toContain(loyalty.tier)
    expect(loyalty.points).toBeGreaterThan(0)

    const notifRes = await page.request.get(API_BASE + '/notifications')
    const notifs = await notifRes.json()
    expect(notifs.data.length).toBeGreaterThan(0)
  })

  test('cancelling a trip flips status to cancelled (read-after-write)', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    const rooms = await listRooms(page, properties[0].id)
    const created = await page.request
      .post(API_BASE + '/reservations', {
        data: {
          room_id: rooms[0].id,
          check_in: isoOffset(50),
          check_out: isoOffset(52),
          guests: 1,
        },
      })
      .then((r) => r.json())

    const cancelled = await page.request.put(API_BASE + '/trips/' + created.id + '/cancel', {
      data: {},
    })
    expect(cancelled.ok()).toBe(true)
    const cancelledBody = await cancelled.json()
    expect(cancelledBody.status).toBe('cancelled')
    expect(cancelledBody.cancellable).toBe(false)

    // Re-fetch and confirm persistence
    const reFetch = await page.request.get(API_BASE + '/trips/' + created.id).then((r) => r.json())
    expect(reFetch.status).toBe('cancelled')
  })

  test('booking confirmation page shows the reservation total + confirmation number', async ({
    page,
  }) => {
    await signup(page)
    const properties = await listProperties(page)
    const rooms = await listRooms(page, properties[0].id)
    const created = await page.request
      .post(API_BASE + '/reservations', {
        data: {
          room_id: rooms[0].id,
          check_in: isoOffset(60),
          check_out: isoOffset(62),
          guests: 2,
        },
      })
      .then((r) => r.json())

    await page.goto('/booking/' + created.id + '/confirmation', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.getByRole('heading', { name: /confirmed/i })).toBeVisible()
    const conf = page.getByTestId('confirmation-number')
    await expect(conf).toContainText(created.confirmation_number ?? created.id)
  })
})
