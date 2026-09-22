import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  bookFlight,
  captureNetwork,
  getSampleFlight,
  seedAlert,
  signup,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink flow: a brand-new traveler signs up, searches
 * for a flight, books it, manages the resulting trip (check-in), seeds a
 * price alert from the alerts page, edits their profile, and lands on
 * /plan-updated. Every primary surface gets touched once. Read-after-
 * write assertions ensure persisted backend state matches what the UI
 * showed.
 */
test('user journey: signup → search → book → check-in → alert → settings → notifications', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // 1) Signup, lands on /search
  const { accessToken } = await signup(page)
  await expect(page).toHaveURL(/\/search/)

  // 2) Search produces results, click first one to /flight/:id
  await page.waitForTimeout(1200)
  const cards = page.locator('[href^="/flight/"]')
  await expect(cards.first()).toBeAttached()

  // 3) Use the API helper to book a real flight (also asserts trip status=booked)
  const flight = await getSampleFlight(page)
  const trip = await bookFlight(page, accessToken, flight)
  expect(trip.status).toBe('booked')

  // 4) /trips lists the booked trip
  await page.goto(APP_BASE + '/trips')
  await page.waitForTimeout(1200)
  await expect(page.locator(`a[href="/trips/${trip.id}"]`).first()).toBeVisible()

  // 5) /trips/:id check-in writes through to backend
  await page.goto(APP_BASE + `/trips/${trip.id}`)
  await page.waitForTimeout(1500)
  await page.getByTestId('trip-check-in').click()
  await page.waitForTimeout(1500)
  const after = (await page.request
    .get(`${API_BASE}/trips/${trip.id}`, { headers: apiHeaders(accessToken) })
    .then((r) => r.json())) as { flight_payload?: Record<string, unknown> }
  expect(after.flight_payload?.checked_in_at).toBeTruthy()

  // 6) Seed a price alert via API, /alerts shows it
  await seedAlert(page, accessToken, {
    origin_iata: 'JFK',
    destination_iata: 'LHR',
    target_price_cents: 60000,
  })
  await page.goto(APP_BASE + '/alerts')
  await page.waitForTimeout(1500)
  await expect(page.getByText(/JFK/).first()).toBeVisible()

  // 7) /settings profile patch persists
  await page.goto(APP_BASE + '/settings')
  await page.waitForTimeout(1500)
  await page.locator('input').nth(2).fill('SFO')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /save changes/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\//.test(r.url))
  expect(patch?.status, 'profile patch ok').toBeLessThan(400)

  // 8) /api/notifications reachable
  const notifs = await page.request.get(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
  })
  expect(notifs.ok()).toBe(true)

  // 9) Preferences read-after-write via the server-side channel (the user
  // resource never returns oauthData, so /api/preferences is the read-back).
  const prefsRes = await page.request.get(`${API_BASE}/preferences`, {
    headers: apiHeaders(accessToken),
  })
  expect(prefsRes.ok()).toBe(true)
  const prefs = (await prefsRes.json()) as { home_airport?: string }
  expect(prefs.home_airport).toBe('SFO')
})
