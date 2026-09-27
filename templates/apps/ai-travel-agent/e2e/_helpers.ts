/**
 * e2e helpers for ai-travel-agent (Wayfarer).
 *
 * Auth via the public signup form (POST /api/users) so each test gets
 * a fresh isolated user. Speech backs onto OpenAI, the agent onto Anthropic;
 * flights come from the seeded inventory unless Amadeus keys are set, and
 * texts are captured unless Twilio keys are set. Keys come from the smoke env.
 */
import type { Page } from '@molecule/app-e2e-fixtures-default'
import { expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3200')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'wayfarer'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
  name: string
}

/** Signup writes a fresh row in `users`; the auth bond redirects to the
 *  talk surface once the access token comes back. */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  const name = opts.name ?? 'Wayfarer Tester'
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Name field comes first. The molecule auth bond renders <input> with
  // no `type` attribute on text fields, so a `[type=text]` query misses
  // it — we anchor on the visible placeholder ("e.g. ...") instead.
  const nameInput = page.locator('input[placeholder*="e.g."]').first()
  if ((await nameInput.count().catch(() => 0)) > 0) {
    await nameInput.fill(name)
  } else {
    // Fallback: first untyped input (no type attribute) is the name field.
    const candidate = page.locator('input:not([type])').first()
    if ((await candidate.count().catch(() => 0)) > 0) {
      await candidate.fill(name)
    }
  }
  await page.locator('input[type="email"]').fill(email)
  // The "Confirm password" field is a second password input; fill both.
  const passwordInputs = page.locator('input[type="password"]')
  const pcount = await passwordInputs.count()
  await passwordInputs.nth(0).fill(password)
  if (pcount > 1) await passwordInputs.nth(1).fill(password)
  // Hardened against an auth-race: arm the POST /api/users listener
  // BEFORE clicking submit, assert it returned 2xx, then wait for the
  // navigation away from /signup, then poll for the persisted access
  // token. The auth-state hook runs in a microtask after the POST
  // resolves; without these gates fast follow-up `api(page, ...)` calls
  // could read localStorage before the token landed → 401 flakes.
  const submit = page
    .getByRole('button', { name: /create.*account|sign.*up|get.*started|start/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

/** Login an existing user via the public form. Same hardening as signup(). */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign in|log in/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Capture network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number; postData: string | null }>> {
  const reqs: Array<{ method: string; url: string; status: number; postData: string | null }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      postData: resp.request().postData() ?? null,
    })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/** Decode the userId from a JWT (the `userId` claim our auth bond
 *  signs). No verification — this is a test-only helper. */
function decodeJwtUserId(token: string): string {
  const parts = token.split('.')
  if (parts.length < 2) return ''
  try {
    const payload = parts[1] ?? ''
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const raw = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    const decoded = JSON.parse(raw) as Record<string, unknown>
    const id = (decoded.userId ?? decoded.sub ?? decoded.id) as unknown
    return typeof id === 'string' ? id : ''
  } catch {
    return ''
  }
}

/** Resolve the active user's id by decoding the persisted access token. */
export async function getUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  return decodeJwtUserId(token ?? '')
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

/** Authenticated API request from a logged-in page context. */
export async function apiGet<T>(page: Page, path: string): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await page.request.get(API_BASE + path, { headers })
  expect(res.status(), `GET ${path} should be 2xx`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiPost<T>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await page.request.post(API_BASE + path, {
    headers,
    data: JSON.stringify(body),
  })
  expect(res.status(), `POST ${path} should be 2xx`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiPatch<T>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await page.request.patch(API_BASE + path, {
    headers,
    data: JSON.stringify(body),
  })
  expect(res.status(), `PATCH ${path} should be 2xx`).toBeLessThan(400)
  return (await res.json()) as T
}

/** A date a week out, as YYYY-MM-DD (the seeded inventory covers the next 45 days). */
export function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString().slice(0, 10)
}

export interface FlightOption {
  id: string
  flightNumber: string
  origin: string
  destination: string
  departAt: string
  priceCents: number
  currency: string
}

export interface Booking {
  id: string
  trip_id: string
  confirmation_code: string
  status: string
  flight_id: string | null
  flight_number: string
  origin_iata: string
  destination_iata: string
  total_cents: number
  currency: string
}

/** Search the inventory the way the Talk page's agent does. */
export async function searchFlights(
  page: Page,
  origin = 'JFK',
  destination = 'LHR',
): Promise<FlightOption[]> {
  return await apiGet<FlightOption[]>(
    page,
    `/flights/search?origin=${origin}&destination=${destination}&date=${dateInDays(7)}`,
  )
}

/** Book the cheapest flight on a route through the same endpoint the UI uses. */
export async function bookViaApi(page: Page, passengers = 2): Promise<Booking> {
  const options = await searchFlights(page)
  expect(options.length, 'the seeded inventory should have flights a week out').toBeGreaterThan(0)
  return await apiPost<Booking>(page, '/bookings', {
    flight_id: options[0]!.id,
    passengers,
    card_last4: '4242',
  })
}

/** Split a booking through the same endpoint the trip page uses. */
export async function splitViaApi(
  page: Page,
  bookingId: string,
  people: Array<{ name: string; contact?: string }>,
): Promise<
  Array<{ id: string; name: string; amount_cents: number; pay_token: string; status: string }>
> {
  return await apiPost(page, `/bookings/${bookingId}/split`, { people })
}
