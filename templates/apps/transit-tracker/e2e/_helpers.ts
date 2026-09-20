// Shared Playwright helpers for transit-tracker e2e specs. Every spec
// imports from this module rather than re-implementing auth / network /
// seeding plumbing. Read-after-write helpers (signup, saveStop, etc.)
// return the live API row so tests can assert on persisted state.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3190')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4190') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'metropulse') {
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
 * the JWT bearer access token, and the user id. Tests use the access token
 * to make authenticated API requests directly via page.request.* (which has
 * its own cookie jar, separate from the live browser session).
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
  await page.waitForURL('**/nearby', { timeout: 15000 })
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
//
// Demo-data rule: specs never hardcode seeded stop/line names or codes —
// every expected value is READ from the same API the app reads, then the UI
// is asserted against that row.

export interface StopRow {
  code: string
  name: string
  hub: boolean
}

/** Pull a representative stop from /api/network/stops (hubs come first). */
export async function getSampleStop(page: Page): Promise<StopRow> {
  const res = await page.request.get(`${API_BASE}/network/stops`)
  expect(res.ok(), 'stop list reachable').toBe(true)
  const list = (await res.json()) as StopRow[]
  expect(list.length, 'expected at least one stop').toBeGreaterThan(0)
  return list[0]
}

export interface LineRow {
  code: string
  name: string
  kind: string
  color: string
  stops: string[]
}

/** Pull a representative line from /api/network/lines. */
export async function getSampleLine(page: Page): Promise<LineRow> {
  const res = await page.request.get(`${API_BASE}/network/lines`)
  expect(res.ok(), 'line list reachable').toBe(true)
  const list = (await res.json()) as LineRow[]
  expect(list.length, 'expected at least one line').toBeGreaterThan(0)
  return list[0]
}

export interface SavedStopRow {
  id: string
  code: string
  name: string
  hub: boolean
}

/** Save a stop through the product API; returns the persisted row. */
export async function saveStop(
  page: Page,
  accessToken: string,
  stopCode: string,
): Promise<{ stop_code?: string; code?: string }> {
  const res = await page.request.post(`${API_BASE}/saved-stops`, {
    headers: apiHeaders(accessToken),
    data: { stop_code: stopCode },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as { stop_code?: string; code?: string }
}

export interface BoardArrival {
  lineCode: string
  direction: number
  destinationName: string
  secondsUntil: number
  arrivalEpochMs: number
  line: { code: string; name: string; kind: string; color: string }
}

/** Read a stop's simulated live board (deterministic for a given clock). */
export async function getBoard(page: Page, stopCode: string): Promise<BoardArrival[]> {
  const res = await page.request.get(`${API_BASE}/arrivals/${encodeURIComponent(stopCode)}`)
  expect(res.ok(), `arrivals board for ${stopCode}`).toBe(true)
  const body = (await res.json()) as { arrivals: BoardArrival[] }
  return body.arrivals
}
