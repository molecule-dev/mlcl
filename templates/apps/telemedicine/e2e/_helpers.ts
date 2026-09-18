// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'tm') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user via the UI and land on the app. Returns the
 *  credentials AND the JWT bearer token persisted to localStorage by the
 *  auth client so callers can authenticate page.request.* calls (which
 *  use a separate cookie jar than the live browser).
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation off /signup, then poll until
 *  the JWT actually lands in localStorage. Eliminates the API-only flake
 *  where a spec fired an authed request before the auth-state hook had
 *  written the token. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
): Promise<{ email: string; password: string; accessToken: string; userId: string }> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  // Pull the access token from the httpOnly cookie [M1-1] and the user id
  // from the /users/me endpoint so callers can use page.request.* with bearer auth.
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userJson = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userJson?.props?.id ?? userJson?.id ?? null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId: userId ?? '' }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /(sign\s*in|log\s*in)/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Log out via the user menu. Returns silently if the menu is not visible. */
export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /(account|menu|profile|user)/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click().catch(() => {})
  const out = page.getByRole('button', { name: /(sign\s*out|log\s*out)/i }).first()
  if (await out.count().catch(() => 0)) await out.click().catch(() => {})
}

/** [M1-1] The bearer token is held in memory (a localStorage copy is
 *  XSS-exfiltratable); the persistent credential is the httpOnly `token`
 *  cookie (prod: `__Host-token`), readable in tests via the Playwright
 *  context. Its value IS the JWT. */
export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** Capture all network responses during a block; mocked-only tests will
 *  return empty. Useful for asserting the app actually called the API.
 *  Waits for networkidle after fn() to ensure post-render useEffect
 *  fetches are captured (heading visibility races vs. data fetches). */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
    // Drain any post-render fetches the test didn't explicitly await.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
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

/** Authed API helpers — use the JWT bearer token from signup() to drive
 *  page.request.* without a real browser session. */
export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/** Find the first directory provider id (used by booking + provider-detail
 *  flows). The directory is auto-seeded at server boot. */
export async function firstProviderId(page: Page): Promise<string> {
  const res = await page.request.get(`${API_BASE}/providers`)
  expect(res.status(), 'GET /api/providers must return 2xx').toBeLessThan(400)
  const list = (await res.json()) as Array<{ id: string }>
  expect(Array.isArray(list)).toBe(true)
  expect(list.length, 'directory must seed at least one provider at boot').toBeGreaterThan(0)
  return list[0].id
}

/** A provider row as the public directory returns it. */
export interface DirectoryProvider {
  id: string
  display_name: string
  specialty?: string
}

/**
 * The provider directory as the app serves it. Specs read the providers they
 * drive from here instead of naming one — the directory is the first thing an
 * app's owner replaces, and a spec that names a row fails on a correct app.
 */
export async function getProviders(page: Page): Promise<DirectoryProvider[]> {
  const res = await page.request.get(`${API_BASE}/providers`)
  expect(res.status(), 'GET /api/providers must return 2xx').toBeLessThan(400)
  const list = (await res.json()) as DirectoryProvider[]
  expect(list.length, 'directory must seed at least one provider at boot').toBeGreaterThan(0)
  return list
}

/**
 * Two providers whose display names are unambiguous for a text search —
 * neither name contains the other, so searching one must exclude the other.
 */
export async function pickTwoDistinctProviders(
  page: Page,
): Promise<{ target: DirectoryProvider; other: DirectoryProvider }> {
  const list = await getProviders(page)
  const disjoint = (a: string, b: string) =>
    !a.toLowerCase().includes(b.toLowerCase()) && !b.toLowerCase().includes(a.toLowerCase())
  for (const target of list) {
    const other = list.find(
      (p) => p.id !== target.id && disjoint(p.display_name, target.display_name),
    )
    if (other) return { target, other }
  }
  throw new Error('directory needs two providers with distinguishable names')
}

/** The specialty catalog behind the directory's filter dropdown. */
export async function getSpecialties(
  page: Page,
): Promise<Array<{ slug?: string; label?: string }>> {
  const res = await page.request.get(`${API_BASE}/providers/specialties`)
  expect(res.status()).toBe(200)
  const list = (await res.json()) as Array<{ slug?: string; label?: string }>
  expect(list.length, 'specialty catalog must not be empty').toBeGreaterThan(0)
  return list
}

/** GET an authed endpoint as JSON. */
export async function apiGet<T>(page: Page, accessToken: string, path: string): Promise<T> {
  const res = await page.request.get(API_BASE + path, { headers: apiHeaders(accessToken) })
  expect(res.status(), `GET ${path} → ${res.status()}`).toBeLessThan(400)
  return (await res.json()) as T
}

/** Escape a value read from the API before using it in a locator regex. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The last-known vitals chips the dashboard + consult pages render. */
export interface VitalChip {
  label: string
  value: string
  unit: string
}

export async function getVitalsSnapshot(page: Page, accessToken: string): Promise<VitalChip[]> {
  const chips = await apiGet<VitalChip[]>(page, accessToken, '/reports/vitals-snapshot')
  expect(chips.length, 'vitals snapshot must not be empty').toBeGreaterThan(0)
  return chips
}

/** The signed-in user's prescriptions, as the page reads them. */
export interface PrescriptionRow {
  id: string
  drug: string
  status: string
}

export async function getPrescriptions(
  page: Page,
  accessToken: string,
): Promise<PrescriptionRow[]> {
  return apiGet<PrescriptionRow[]>(page, accessToken, '/prescriptions')
}

/** The signed-in user's medical records, as the page reads them. */
export interface MedicalRecordRow {
  id: string
  type: string
  summary: string
}

export async function getRecords(page: Page, accessToken: string): Promise<MedicalRecordRow[]> {
  return apiGet<MedicalRecordRow[]>(page, accessToken, '/records')
}

/** The signed-in user's notifications, as the feed reads them. */
export interface NotificationRow {
  id: string
  title: string
  body: string
  href?: string | null
}

export async function getNotifications(
  page: Page,
  accessToken: string,
): Promise<NotificationRow[]> {
  return apiGet<NotificationRow[]>(page, accessToken, '/notifications')
}

/** The signed-in user's appointments, as the schedule reads them. */
export interface AppointmentRow {
  id: string
  status: string
  reason: string | null
  patient_id?: string
  patient_name?: string
}

export async function getAppointments(page: Page, accessToken: string): Promise<AppointmentRow[]> {
  return apiGet<AppointmentRow[]>(page, accessToken, '/appointments')
}

/** Pull one available slot for a provider. Throws if none. */
export async function firstAvailableSlot(
  page: Page,
  providerId: string,
): Promise<{ id: string; starts_at: string; ends_at: string }> {
  const res = await page.request.get(`${API_BASE}/providers/${providerId}/availability`)
  expect(res.status()).toBeLessThan(400)
  const slots = (await res.json()) as Array<{ id: string; starts_at: string; ends_at: string }>
  expect(slots.length, 'provider must have at least one availability slot').toBeGreaterThan(0)
  return slots[0]
}
