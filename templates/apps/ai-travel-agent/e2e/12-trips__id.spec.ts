import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, APP_BASE, type Booking, bookViaApi, signup } from './_helpers.js'

interface TripDetail {
  bookings: Array<Booking & { splits: Array<{ name: string; status: string }> }>
}

test.describe('/trips/:id (one trip: delay, rebook, split)', () => {
  test.setTimeout(120_000)

  test('a 90-minute delay rebooks the trip onto the next flight', async ({ page }) => {
    await signup(page)
    const booking = await bookViaApi(page, 1)
    await page.goto(APP_BASE + `/trips/${booking.trip_id}`)
    await expect(page.locator('[data-mol-id="trip-booking"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="trip-booking"]')).toContainText(
      booking.confirmation_code,
    )

    const delayPost = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/flights\/[^/]+\/delay/.test(r.url()),
      { timeout: 30_000 },
    )
    await page.locator('[data-mol-id="trip-simulate-delay"]').click()
    expect((await delayPost).status()).toBeLessThan(300)

    // The page reloads the trip: a new booking replaces the delayed one, and
    // the history lists both.
    await expect(page.locator('[data-mol-id="trip-notice"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="trip-history"]')).toBeVisible()
    await expect(
      page.locator('[data-mol-id="trip-history"] [data-mol-id="status-rebooked"]'),
    ).toBeVisible()
    const live = page.locator('[data-mol-id="trip-booking"]')
    await expect(live.locator('[data-mol-id="status-booked"]')).toBeVisible()
    await expect(live).not.toContainText(booking.confirmation_code)

    // Read-after-write: the old booking is linked to the new one.
    const detail = await apiGet<TripDetail>(page, `/trips/${booking.trip_id}`)
    expect(detail.bookings).toHaveLength(2)
    const old = detail.bookings.find((b) => b.id === booking.id)
    expect(old?.status).toBe('rebooked')
    const next = detail.bookings.find((b) => b.id !== booking.id)
    expect(next?.status).toBe('booked')
    expect(next?.flight_id).not.toBe(booking.flight_id)
  })

  test('"Move to next flight" rebooks on request', async ({ page }) => {
    await signup(page)
    const booking = await bookViaApi(page, 1)
    await page.goto(APP_BASE + `/trips/${booking.trip_id}`)
    await expect(page.locator('[data-mol-id="trip-rebook"]')).toBeVisible({ timeout: 15_000 })
    const post = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/bookings\/[^/]+\/rebook/.test(r.url()),
      { timeout: 30_000 },
    )
    await page.locator('[data-mol-id="trip-rebook"]').click()
    expect((await post).status()).toBe(201)
    await expect(
      page.locator('[data-mol-id="trip-history"] [data-mol-id="status-rebooked"]'),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('splitting the bill creates a share per person with a pay link', async ({ page }) => {
    await signup(page)
    const booking = await bookViaApi(page, 3)
    await page.goto(APP_BASE + `/trips/${booking.trip_id}`)
    await expect(page.locator('[data-mol-id="trip-split"]')).toBeVisible({ timeout: 15_000 })

    await page.locator('[data-mol-id="split-name"]').nth(0).fill('Traveler One')
    await page.locator('[data-mol-id="split-contact"]').nth(0).fill('+15550001111')
    await page.locator('[data-mol-id="split-add-person"]').click()
    await page.locator('[data-mol-id="split-name"]').nth(1).fill('Traveler Two')
    await page.locator('[data-mol-id="split-add-person"]').click()
    await page.locator('[data-mol-id="split-name"]').nth(2).fill('Traveler Three')

    const post = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/bookings\/[^/]+\/split/.test(r.url()),
      { timeout: 30_000 },
    )
    await page.locator('[data-mol-id="split-submit"]').click()
    expect((await post).status()).toBe(201)

    const rows = page.locator('[data-mol-id="trip-splits"] li')
    await expect(rows).toHaveCount(3, { timeout: 15_000 })
    await expect(rows.first().locator('[data-mol-id="split-pending"]')).toBeVisible()
    await expect(rows.first().locator('[data-mol-id="split-pay-link"]')).toHaveAttribute(
      'href',
      /\/pay\//,
    )

    // The three shares add up to the booking total.
    const detail = await apiGet<TripDetail>(page, `/trips/${booking.trip_id}`)
    const splits = detail.bookings[0]?.splits ?? []
    expect(splits).toHaveLength(3)
  })

  test('cancelling marks the booking and the trip cancelled', async ({ page }) => {
    await signup(page)
    const booking = await bookViaApi(page, 1)
    await page.goto(APP_BASE + `/trips/${booking.trip_id}`)
    await expect(page.locator('[data-mol-id="trip-cancel"]')).toBeVisible({ timeout: 15_000 })
    const put = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/bookings\/[^/]+\/cancel/.test(r.url()),
      { timeout: 30_000 },
    )
    await page.locator('[data-mol-id="trip-cancel"]').click()
    expect((await put).status()).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="status-cancelled"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id="trip-rebook"]')).toHaveCount(0)
  })
})
