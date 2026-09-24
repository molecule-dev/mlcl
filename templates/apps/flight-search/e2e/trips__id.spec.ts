import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bookFlight,
  captureNetwork,
  getSampleFlight,
  signup,
} from './_helpers.js'

test.describe('/trips/:id (TripDetail) page', () => {
  test('renders trip hero, segment list, Manage actions, GET /api/trips/:id fires', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)
    const trip = await bookFlight(page, accessToken, flight)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/trips/${trip.id}`)
      await page.waitForTimeout(1500)
    })
    const get = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/trips/${trip.id}`).test(r.url),
    )
    expect(get, 'GET /api/trips/:id').toBeTruthy()
    expect(get?.status).toBeLessThan(400)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(flight.origin_code)
    // Confirmation code visible
    expect(trip.confirmation_code).toBeTruthy()
    await expect(page.getByText(trip.confirmation_code as string)).toBeVisible()
    // Manage buttons
    await expect(page.getByTestId('trip-check-in')).toBeVisible()
    await expect(page.getByTestId('trip-change-flight')).toBeVisible()
    await expect(page.getByTestId('trip-share')).toBeVisible()
  })

  test('Check in passengers persists checked_in_at on the backend (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)
    const trip = await bookFlight(page, accessToken, flight)
    await page.goto(APP_BASE + `/trips/${trip.id}`)
    await page.waitForTimeout(1500)

    const before = (await page.request
      .get(`${API_BASE}/trips/${trip.id}`, {
        headers: apiHeaders(accessToken),
      })
      .then((r) => r.json())) as { flight_payload?: Record<string, unknown> }
    expect(before.flight_payload?.checked_in_at, 'not checked-in yet').toBeFalsy()

    await page.getByTestId('trip-check-in').click()
    await page.waitForTimeout(2000)

    const after = (await page.request
      .get(`${API_BASE}/trips/${trip.id}`, {
        headers: apiHeaders(accessToken),
      })
      .then((r) => r.json())) as { flight_payload?: Record<string, unknown> }
    expect(after.flight_payload?.checked_in_at, 'checked-in timestamp persisted').toBeTruthy()
    // UI badge flips to "Checked in"
    await expect(page.getByTestId('trip-check-in')).toContainText(/Checked in/i)
  })

  test('Change flight navigates to /search prefilled with origin/destination', async ({ page }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)
    const trip = await bookFlight(page, accessToken, flight)
    await page.goto(APP_BASE + `/trips/${trip.id}`)
    await page.waitForTimeout(1500)

    await page.getByTestId('trip-change-flight').click()
    await expect(page).toHaveURL(
      new RegExp(
        `/search\\?.*origin=${flight.origin_code}.*destination=${flight.destination_code}`,
      ),
    )
  })

  test('Share copies the trip URL to clipboard when share API is unavailable', async ({ page }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)
    const trip = await bookFlight(page, accessToken, flight)
    await page.goto(APP_BASE + `/trips/${trip.id}`)
    await page.waitForTimeout(1200)

    // Force the clipboard fallback path (some browsers don't expose nav.share).
    await page.evaluate(() => {
      ;(window as unknown as { __copied?: string }).__copied = ''
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        get: () => ({
          writeText: async (s: string) => {
            ;(window as unknown as { __copied?: string }).__copied = s
          },
        }),
      })
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        get: () => undefined,
      })
    })

    await page.getByTestId('trip-share').click()
    await page.waitForTimeout(700)
    const copied = await page.evaluate(
      () => (window as unknown as { __copied?: string }).__copied ?? '',
    )
    expect(copied).toContain(`/trips/${trip.id}`)
    await expect(page.getByTestId('trip-share')).toContainText(/Link copied/i)
  })

  test('Cancel trip flips backend status to "cancelled"', async ({ page }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)
    const trip = await bookFlight(page, accessToken, flight)
    await page.goto(APP_BASE + `/trips/${trip.id}`)
    await page.waitForTimeout(1500)

    // ConfirmButton two-step confirm: first click arms, second commits.
    const cancelBtn = page.getByRole('button', { name: /cancel/i })
    await cancelBtn.click()
    await expect(cancelBtn).toContainText(/cancel this trip\?/i)
    await cancelBtn.click()
    await page.waitForURL(/\/trips$/, { timeout: 6000 })
    await page.waitForTimeout(800)

    const after = (await page.request
      .get(`${API_BASE}/trips/${trip.id}`, { headers: apiHeaders(accessToken) })
      .then((r) => r.json())) as { status: string }
    expect(after.status).toBe('cancelled')
  })

  test('check-in is rejected for non-booked trips (409)', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Create a non-booked trip directly via API
    const draftRes = await page.request.post(`${API_BASE}/trips`, {
      headers: apiHeaders(accessToken),
      data: { kind: 'saved', total_cents: 100 },
    })
    const draft = (await draftRes.json()) as { id: string }
    const checkin = await page.request.post(`${API_BASE}/trips/${draft.id}/check-in`, {
      headers: apiHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(checkin.status()).toBe(409)
  })
})
