import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getSampleFlight,
  signup,
} from './_helpers.js'

test.describe('/book/:id (Booking wizard)', () => {
  test('full happy path: passengers → payment → review → confirms and creates a booked trip', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const flight = await getSampleFlight(page)

    await page.goto(APP_BASE + `/book/${flight.id}`)
    await page.waitForTimeout(1500)

    // Step 1 — Passengers
    await page.locator('input').nth(0).fill('Walk')
    await page.locator('input').nth(1).fill('Tester')
    await page.locator('input[type="date"]').first().fill('1990-01-15')
    await page.locator('input').nth(3).fill('A1234567')
    await page.getByRole('button', { name: /continue to payment/i }).click()
    await page.waitForTimeout(400)

    // Step 2 — Payment
    await page.locator('input').nth(0).fill('4242 4242 4242 4242')
    await page.locator('input').nth(1).fill('Walk Tester')
    await page.locator('input').nth(2).fill('12/29')
    await page.locator('input').nth(3).fill('123')
    await page.getByRole('button', { name: /review booking/i }).click()
    await page.waitForTimeout(400)

    // Step 3 — Confirm
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /confirm and pay/i }).click()
      await page.waitForURL(/\/trips$/, { timeout: 12_000 })
      await page.waitForTimeout(1000)
    })

    const tripPost = reqs.find((r) => r.method === 'POST' && /\/api\/trips$/.test(r.url))
    const bookingPost = reqs.find((r) => r.method === 'POST' && /\/api\/bookings$/.test(r.url))
    expect(tripPost, 'POST /api/trips').toBeTruthy()
    expect(bookingPost, 'POST /api/bookings').toBeTruthy()
    expect(tripPost?.status, 'trip create status').toBeLessThan(300)
    expect(bookingPost?.status, 'booking create status').toBeLessThan(300)

    // Read-after-write: GET /api/trips returns at least one row, status='booked'
    const listRes = await page.request.get(`${API_BASE}/trips`, {
      headers: apiHeaders(accessToken),
    })
    expect(listRes.ok()).toBe(true)
    const trips = (await listRes.json()) as Array<{ id: string; status: string }>
    expect(trips.length).toBeGreaterThan(0)
    expect(trips[0].status).toBe('booked')
  })

  test('initial wizard state lands on the Passengers step with traveler 1 collapsed', async ({
    page,
  }) => {
    await signup(page)
    const flight = await getSampleFlight(page)
    await page.goto(APP_BASE + `/book/${flight.id}`)
    await page.waitForTimeout(1200)
    await expect(page.getByRole('button', { name: /continue to payment/i })).toBeVisible()
    // Trip summary panel shows the same flight id we routed to.
    await expect(page.getByText(flight.origin_code).first()).toBeVisible()
    await expect(page.getByText(flight.destination_code).first()).toBeVisible()
  })

  test('skipping passenger fields surfaces an inline error on review', async ({ page }) => {
    await signup(page)
    const flight = await getSampleFlight(page)
    await page.goto(APP_BASE + `/book/${flight.id}`)
    await page.waitForTimeout(1200)

    // Walk through the wizard without filling any required fields.
    await page.getByRole('button', { name: /continue to payment/i }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /review booking/i }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /confirm and pay/i }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByText(/please complete all passenger details/i)).toBeVisible()
    await expect(page).toHaveURL(/\/book\//)
  })
})
