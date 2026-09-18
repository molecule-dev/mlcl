// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * A 3-night stay window that no other booking in this run has claimed.
 *
 * WHAT WAS WRONG: every booking test drove the same first property/room with
 * the SAME hard-coded window (today+30 → today+33). The API enforces REAL
 * inventory — `room_types.total_rooms` (4 on the first seeded room) caps how
 * many ACTIVE bookings may overlap a given set of nights, and POST /bookings
 * answers 409 "fully booked" once every unit is taken (the deliberate guard in
 * api/src/handlers/bookings.ts, covered by booking-inventory-capacity.test.ts).
 * So the tests contended for those 4 units: observed in the DB, room …011 had
 * total_rooms=4 and exactly 4 active overlapping rows, and every test past the
 * 4th died inside its own setup helper on a misleading `expect([200,201])` —
 * the app was right, the fixture was self-colliding.
 *
 * Handing each booking its own nights removes the contention entirely, in any
 * order and at any suite size. Two things matter:
 *  - a per-call counter, so no two bookings in a run share a window (a retried
 *    test also takes fresh nights rather than re-consuming its own unit);
 *  - a per-run base, so repeated runs against a database that ISN'T reset in
 *    between don't refill the same windows and exhaust the 4 units after a few
 *    runs. Scaling the minute spreads back-to-back runs far apart in slot space
 *    instead of letting their ranges overlap.
 * Slots sit 4 days apart for a 3-night stay, so neighbours stay disjoint even
 * when two calls land on opposite sides of midnight UTC.
 */
const STAY_SLOTS = 1024
const STAY_RUN_BASE = Math.floor(Date.now() / 60_000) * 97
let staySlot = 0
export function uniqueStayWindow(): { checkIn: string; checkOut: string } {
  const slot = (STAY_RUN_BASE + staySlot++) % STAY_SLOTS
  const startDay = 30 + slot * 4
  const dayFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
  return { checkIn: dayFromNow(startDay), checkOut: dayFromNow(startDay + 3) }
}

/**
 * Sign up a fresh user; returns the credentials.
 *
 * Hardening (mirrors virtual-classroom): arm the POST /api/users response
 * listener BEFORE click so a fast response can't be missed, gate click on
 * the submit button being enabled, assert the POST succeeded, wait for
 * navigation off /signup, then poll until the access token lands in the
 * httpOnly cookie. Eliminates an auth-race where api(page, ...) calls
 * immediately after signup() saw 401 because the auth-state hook hadn't
 * persisted the JWT yet.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // travel-booking signup requires firstName + lastName + email + password + confirm
  const first = page.locator('input[autocomplete="given-name"]').first()
  if (await first.count().catch(() => 0)) await first.fill('Test')
  const last = page.locator('input[autocomplete="family-name"]').first()
  if (await last.count().catch(() => 0)) await last.fill('Traveler')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // confirm password: second password field if present
  const pwds = page.locator('input[type="password"]')
  if ((await pwds.count()) >= 2) await pwds.nth(1).fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /create account|sign\s*up|register|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block; mocked-only tests will
 *  return empty. Useful for asserting the app actually called the API. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type: () => string; text: () => string }) => {
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

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** Hit the API directly with the page's bearer token. */
export async function apiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const token = await getAccessToken(page)
  const res = await page.request.fetch(API_BASE + path, {
    method,
    headers: token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    data: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let parsed: unknown = null
  try {
    parsed = await res.json()
  } catch {
    parsed = await res.text()
  }
  return { status: res.status(), body: parsed }
}
