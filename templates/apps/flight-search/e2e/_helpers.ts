// Shared Playwright helpers for flight-search e2e specs. Every spec
// imports from this module rather than re-implementing auth / network /
// seeding plumbing. Read-after-write helpers (signup, seedTrip, etc.)
// return the live API row so tests can assert on persisted state.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3180')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4180') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'skylark') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export interface SignedUpUser {
  email: string
  password: string
  accessToken: string
  userId: string | null
}

/**
 * Sign up a fresh user via the UI signup form. Returns email, password,
 * the JWT bearer access token persisted to localStorage, and the user id.
 * Tests use the access token to make authenticated API requests directly
 * via page.request.* (which has its own cookie jar, separate from the
 * live browser session).
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
): Promise<SignedUpUser> {
  await page.goto(APP_BASE + '/signup')
  // First name + last name (autocomplete attributes guarantee selectors).
  await page.locator('input[autocomplete="given-name"]').first().fill('E2E')
  await page.locator('input[autocomplete="family-name"]').first().fill('Tester')
  await page.locator('input[type="email"]').first().fill(email)
  const pwds = page.locator('input[autocomplete="new-password"]')
  await pwds.nth(0).fill(password)
  await pwds.nth(1).fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForURL('**/search', { timeout: 15000 })
  const accessToken = await getAccessToken(page)
  let userId: string | null = null
  const meRes = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  if (meRes.ok()) {
    const meBody = (await meRes.json()) as { props?: { id?: string }; id?: string }
    userId = meBody?.props?.id ?? meBody?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
}

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/**
 * Fail the test if any console.error fires during fn (allowing benign
 * third-party noise).
 */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain-specific helpers ----------

export interface SearchableFlight {
  id: string
  airline: string
  flight_number: string
  origin_code: string
  destination_code: string
  price: number
  price_cents: number
  cabin: string
  currency: string
}

/** Pull a representative seeded JFK→CDG flight from /api/flights/search. */
export async function getSampleFlight(
  page: Page,
  origin = 'JFK',
  destination = 'CDG',
): Promise<SearchableFlight> {
  const res = await page.request.get(
    `${API_BASE}/flights/search?origin=${origin}&destination=${destination}`,
  )
  expect(res.ok(), `flight search ${origin}->${destination}`).toBe(true)
  const list = (await res.json()) as SearchableFlight[]
  expect(list.length, `expected at least one ${origin}->${destination} flight`).toBeGreaterThan(0)
  return list[0]
}

export interface TripRow {
  id: string
  user_id: string
  status: string
  kind: string
  total_cents: number
  flight_payload: Record<string, unknown>
  confirmation_code: string | null
  booked_at: string | null
}

/**
 * Authenticated booking flow:
 *   POST /api/trips kind=booked + POST /api/bookings -> trip flips to
 *   `booked` (since the bookings handler treats card_last4 as paid).
 *   Returns the persisted trip row (read-after-write).
 */
export async function bookFlight(
  page: Page,
  accessToken: string,
  flight: SearchableFlight,
): Promise<TripRow> {
  const flightPayload = {
    flight_id: flight.id,
    airline: flight.airline,
    flight_number: flight.flight_number,
    origin_code: flight.origin_code,
    destination_code: flight.destination_code,
    cabin: flight.cabin,
  }
  const tripRes = await page.request.post(`${API_BASE}/trips`, {
    headers: apiHeaders(accessToken),
    data: {
      kind: 'booked',
      flight_payload: flightPayload,
      passenger_count: 1,
      cabin: flight.cabin,
      total_cents: flight.price_cents,
      currency: flight.currency || 'USD',
    },
    failOnStatusCode: false,
  })
  expect(tripRes.status(), await tripRes.text()).toBeLessThan(300)
  const trip = (await tripRes.json()) as TripRow
  const bookingRes = await page.request.post(`${API_BASE}/bookings`, {
    headers: apiHeaders(accessToken),
    data: {
      trip_id: trip.id,
      flight_id: flight.id,
      passenger_count: 1,
      total_cents: flight.price_cents,
      currency: flight.currency || 'USD',
      card_last4: '4242',
    },
    failOnStatusCode: false,
  })
  expect(bookingRes.status(), await bookingRes.text()).toBeLessThan(300)
  // Re-read the trip to see the booked status applied by the handler.
  const refetch = await page.request.get(`${API_BASE}/trips/${trip.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(refetch.ok()).toBe(true)
  return (await refetch.json()) as TripRow
}

export interface AlertRow {
  id: string
  origin_iata: string
  destination_iata: string
  target_price_cents: number
  active: boolean
}

export async function seedAlert(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    origin_iata: string
    destination_iata: string
    target_price_cents: number
    cabin: string
    departure_date: string
  }> = {},
): Promise<AlertRow> {
  const res = await page.request.post(`${API_BASE}/alerts`, {
    headers: apiHeaders(accessToken),
    data: {
      origin_iata: overrides.origin_iata ?? 'JFK',
      destination_iata: overrides.destination_iata ?? 'CDG',
      target_price_cents: overrides.target_price_cents ?? 80000,
      cabin: overrides.cabin ?? 'economy',
      departure_date: overrides.departure_date,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as AlertRow
}
