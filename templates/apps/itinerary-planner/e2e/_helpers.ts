// Shared test plumbing for itinerary-planner e2e specs. Every spec
// imports auth + capture utilities from here so signup/login flow,
// network capture, and console-error fail-fast logic stay consistent.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3230')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4230') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'wanderer') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user; returns the credentials. After submit the app
 *  navigates to /dashboard for first-time users.
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation off /signup. Eliminates the
 *  API-only flake where a spec fired an authed call before the auth-state
 *  hook had persisted the token. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // The signup form has Name + Email + Password (no confirm field).
  const nameField = page.getByRole('textbox', { name: /name/i }).first()
  if (await nameField.count().catch(() => 0)) {
    await nameField.fill('Test Wanderer')
  }
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page
    .getByRole('textbox', { name: /^password$/i })
    .first()
    .fill(password)
  const submit = page.getByRole('button', { name: /create.*account|sign\s*up|register/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page
    .getByRole('textbox', { name: /password/i })
    .first()
    .fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
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

/** Sign up + create a trip via the API directly so the rest of the
 *  test can focus on the page under test. Returns trip id + token. */
export async function signupAndCreateTrip(
  page: Page,
  overrides: Partial<{
    name: string
    destination: string
    country: string
    budget_total_cents: number
  }> = {},
): Promise<{ tripId: string; token: string; email: string; password: string }> {
  const creds = await signup(page)
  // Pull the in-page token from localStorage / IndexedDB — molecule
  // stores it under the http client's auth key. Easier: re-login via API.
  const ctx = page.context()
  const resp = await ctx.request.post(API_BASE + '/users/log-in', {
    data: { email: creds.email, password: creds.password },
  })
  if (!resp.ok()) throw new Error('login failed in signupAndCreateTrip: ' + resp.status())
  const body = (await resp.json()) as { accessToken: string }
  const token = body.accessToken
  const tripResp = await ctx.request.post(API_BASE + '/trips', {
    headers: { Authorization: 'Bearer ' + token },
    data: {
      name: overrides.name ?? 'Iceland Loop',
      destination: overrides.destination ?? overrides.name ?? 'Iceland Loop',
      country: overrides.country ?? 'Iceland',
      start_date: '2026-06-12',
      end_date: '2026-06-22',
      status: 'planning',
      budget_total_cents: overrides.budget_total_cents ?? 420_000,
      visibility: 'private',
    },
  })
  if (!tripResp.ok()) throw new Error('createTrip failed: ' + tripResp.status())
  const trip = (await tripResp.json()) as { id: string }
  return { tripId: trip.id, token, email: creds.email, password: creds.password }
}

/** An editorial destination, in the shape `GET /api/destinations` returns. */
export interface DestinationRow {
  id: string
  name: string
  region: string | null
  pill_label: string | null
}

/**
 * The editorial destinations catalog, read from the same endpoint the
 * Destinations page reads. Specs drive whatever the catalog holds rather than
 * naming a seeded place — the editorial rows are the first thing an app's
 * owner replaces, and a spec that names one fails on a correct app.
 */
export async function getDestinations(page: Page): Promise<DestinationRow[]> {
  const resp = await page.context().request.get(API_BASE + '/destinations')
  expect(resp.status(), 'GET /api/destinations').toBeLessThan(400)
  return (await resp.json()) as DestinationRow[]
}

/** A destination from the live catalog. */
export async function pickDestination(page: Page): Promise<DestinationRow> {
  const rows = await getDestinations(page)
  const row = rows[0]
  if (!row) throw new Error('destinations catalog is empty')
  return row
}

/** Read the full state of a created entity to assert read-after-write. */
export async function apiGet<T = unknown>(
  page: Page,
  token: string,
  path: string,
): Promise<{ status: number; body: T }> {
  const resp = await page.context().request.get(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
  })
  return { status: resp.status(), body: (await resp.json()) as T }
}

export async function apiPost<T = unknown>(
  page: Page,
  token: string,
  path: string,
  data: unknown,
): Promise<{ status: number; body: T }> {
  const resp = await page.context().request.post(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
    data,
  })
  return { status: resp.status(), body: (await resp.json()) as T }
}
