import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  isoOffset,
  listProperties,
  listRooms,
  signup,
} from './_helpers.js'

test.describe('/booking/:id (BookingCheckout)', () => {
  test('renders the "Confirm and book" heading once authed', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    const target = properties[0]
    await page.goto(APP_BASE + '/booking/' + target.id, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Confirm and book/i, level: 1 })).toBeVisible()
  })

  test('check-in date is editable + prefilled from query string', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    const target = properties[0]
    const checkIn = isoOffset(40)
    const checkOut = isoOffset(43)
    await page.goto(
      APP_BASE + '/booking/' + target.id + '?check_in=' + checkIn + '&check_out=' + checkOut,
      { waitUntil: 'domcontentloaded' },
    )
    await expect(page.locator('input[type="date"]').nth(0)).toHaveValue(checkIn)
  })

  test('check-out date is editable + prefilled from query string', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    const target = properties[0]
    const checkIn = isoOffset(40)
    const checkOut = isoOffset(43)
    await page.goto(
      APP_BASE + '/booking/' + target.id + '?check_in=' + checkIn + '&check_out=' + checkOut,
      { waitUntil: 'domcontentloaded' },
    )
    await expect(page.locator('input[type="date"]').nth(1)).toHaveValue(checkOut)
  })

  test('Guests combobox accepts a different value', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/booking/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    const combo = page.getByRole('combobox', { name: /Guests/i })
    await combo.selectOption('3')
    await expect(combo).toHaveValue('3')
  })

  test('Room combobox switches the selected room when more than one room exists', async ({
    page,
  }) => {
    await signup(page)
    const properties = await listProperties(page)
    let target = properties[0]
    let rooms = await listRooms(page, target.id)
    for (const p of properties) {
      const r = await listRooms(page, p.id)
      if (r.length > 1) {
        target = p
        rooms = r
        break
      }
    }
    expect(
      rooms.length,
      'the catalog must include at least one multi-room property',
    ).toBeGreaterThan(1)
    await page.goto(APP_BASE + '/booking/' + target.id, { waitUntil: 'domcontentloaded' })
    const combo = page.getByRole('combobox', { name: /Room/i })
    // The booking page fetches /api/properties/:id/rooms async after
    // domcontentloaded; wait for the combo to render before asserting.
    await expect(combo).toBeVisible()
    await combo.selectOption({ index: 1 })
    await expect(combo).toHaveValue(rooms[1].id)
  })

  test('"Credit / debit card" radio is the default payment method', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/booking/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('radio', { name: /Credit \/ debit card/i })).toBeChecked()
  })

  test('booking total renders with a $ value', async ({ page }) => {
    await signup(page)
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/booking/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('booking-total')).toContainText(/\$/)
  })

  test('Confirm submits POST /api/reservations and navigates to /booking/:id/confirmation', async ({
    page,
  }) => {
    await signup(page)
    const properties = await listProperties(page)
    const target = properties[0]
    const checkIn = isoOffset(70)
    const checkOut = isoOffset(73)
    await page.goto(
      APP_BASE + '/booking/' + target.id + '?check_in=' + checkIn + '&check_out=' + checkOut,
      { waitUntil: 'domcontentloaded' },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('confirm-booking').click()
      await page.waitForURL(/\/booking\/.+\/confirmation/, { timeout: 15_000 })
    })
    expect(page.url()).toMatch(/\/booking\/.+\/confirmation/)
    expect(
      reqs.some(
        (r) => r.url.endsWith('/api/reservations') && r.method === 'POST' && r.status === 201,
      ),
      'POST /api/reservations (201) must be observed',
    ).toBeTruthy()

    const tripsRes = await page.request.get(API_BASE + '/trips')
    const trips = (await tripsRes.json()) as { data: Array<{ id: string; property_id: string }> }
    expect(trips.data.some((t) => t.property_id === target.id)).toBe(true)
  })
})
