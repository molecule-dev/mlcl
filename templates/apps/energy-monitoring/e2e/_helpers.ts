// e2e helpers for energy-monitoring (Voltrace).
//
// Auth + base-URL plumbing shared across every spec. Specs ONLY use the
// helpers — they never re-implement signup, login, or seed paths.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3150')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4150') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'volt') {
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

/**
 * Sign up a fresh user via the UI signup form.
 *
 * The Voltrace signup has three FloatingInputs in document order:
 * email, password, name (optional). After submit the auth client sets the
 * httpOnly `token` cookie (M1-1) and navigates to `/`. We push to
 * `/dashboard` to land in the auth shell.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const nameInput = page.locator('input[autocomplete="name"]').first()
  if (await nameInput.count().catch(() => 0)) {
    await nameInput.fill('Volt User ' + Date.now().toString().slice(-6))
  }
  // Deterministic gating: arm POST /api/users BEFORE the click (so a
  // fast response can't be missed), assert < 400, then nav. Tests that
  // immediately fire listMeters/listAlertRules/etc. read accessToken
  // from this helper's return value, but the early throw on a missing
  // token is itself a race source — react routes off /signup the
  // moment POST resolves but the auth-state hook persists the JWT in a
  // subsequent microtask. Poll for it explicitly.
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
  // Signup nav target is `/`; push into dashboard so the AuthGuard shell loads.
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

/** Log in an existing user via the UI form. */
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Sign out via the user menu (header avatar). */
export async function logout(page: Page) {
  const menu = page
    .getByRole('button', { name: /open user menu|account|profile|user menu/i })
    .first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture every network response during a block. Used for outcome
 *  assertions ("did the POST really hit /api/foo and return 2xx?"). */
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

/** Fail the test on any console.error during fn (allowing benign
 *  third-party noise). */
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

// ---------- domain helpers (called via page.request with a JWT) ----------

export interface ApiMeter {
  id: string
  user_id: string
  name: string
  type: string
  location: string | null
  unit: string
  description: string | null
  status: string
}

export async function listMeters(page: Page, accessToken: string): Promise<ApiMeter[]> {
  const res = await page.request.get(`${API_BASE}/meters`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiMeter[]
}

export interface ApiAlertRule {
  id: string
  user_id: string
  name: string
  meter_id: string | null
  type: string
  threshold: string | number
  comparison: string
  notify_email: string | null
  enabled: boolean
}

export async function listAlertRules(page: Page, accessToken: string): Promise<ApiAlertRule[]> {
  const res = await page.request.get(`${API_BASE}/alerts/rules/list`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiAlertRule[]
}

export interface ApiAlert {
  id: string
  type: string
  status: string
  message: string
  value: string | number
  threshold: string | number
}

export async function listAlerts(page: Page, accessToken: string): Promise<ApiAlert[]> {
  const res = await page.request.get(`${API_BASE}/alerts`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiAlert[]
}

export async function evalAlerts(
  page: Page,
  accessToken: string,
): Promise<{ alerts_created: number; alerts: ApiAlert[] }> {
  const res = await page.request.post(`${API_BASE}/alerts/check`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as { alerts_created: number; alerts: ApiAlert[] }
}

export interface ApiRatePlan {
  id: string
  name: string
  rate_per_kwh: string | number
  peak_rate: string | number | null
  off_peak_rate: string | number | null
  peak_start_hour: number | null
  peak_end_hour: number | null
  currency: string
  status: string
}

export async function listRatePlans(page: Page, accessToken: string): Promise<ApiRatePlan[]> {
  const res = await page.request.get(`${API_BASE}/costs/rates`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as ApiRatePlan[]
}

export async function getMe(
  page: Page,
  accessToken: string,
): Promise<{
  id: string
  name: string | null
  email: string | null
  householdSize: number
  goalKwhPerMonth: number
  notifyPush: boolean
  notifyEmail: boolean
  notifyQuietHours: boolean
}> {
  const res = await page.request.get(`${API_BASE}/me`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  return (await res.json()) as {
    id: string
    name: string | null
    email: string | null
    householdSize: number
    goalKwhPerMonth: number
    notifyPush: boolean
    notifyEmail: boolean
    notifyQuietHours: boolean
  }
}

export interface ApiTier {
  key: string
  name: string
  prices: { period: string; price: string; stripePriceId: string | null }[]
  limits: Record<string, unknown>
}

export async function listTiers(page: Page, accessToken: string): Promise<ApiTier[]> {
  const res = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(300)
  const body = (await res.json()) as { data: ApiTier[] }
  return body.data
}
