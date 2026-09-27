import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, bookViaApi, signup } from './_helpers.js'

test.describe('/trips (what the agent booked)', () => {
  test('shows the empty state for a new user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/trips')
    await expect(page.getByRole('heading', { name: /^trips$/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="trips-empty"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="trips-new"]')).toHaveAttribute('href', /\/talk/)
  })

  test('lists a booking with its route, flight and status, and opens the trip', async ({
    page,
  }) => {
    await signup(page)
    const booking = await bookViaApi(page, 2)
    await page.goto(APP_BASE + '/trips')
    const card = page.locator('[data-mol-id="trip-card"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText(`${booking.origin_iata} → ${booking.destination_iata}`)
    await expect(card).toContainText(booking.flight_number)
    await expect(card.locator('[data-mol-id="status-booked"]')).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(new RegExp(`/trips/${booking.trip_id}`), { timeout: 10_000 })
    await expect(page.locator('[data-mol-id="trip-title"]')).toContainText(booking.origin_iata)
  })
})
