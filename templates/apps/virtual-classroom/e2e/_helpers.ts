// Shared Playwright helpers for the virtual-classroom e2e suite.
// Specs import from this module; do not re-implement signup/login/api plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'vc-test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. Virtual-classroom signup has
 * separate first/last name + email + password + confirm fields.
 *
 * Why the explicit waits below: the prior implementation only waited for
 * navigation away from `/signup`. React routes a moment after `POST
 * /api/users` resolves, but the auth-state hook that persists the JWT
 * into localStorage runs in a subsequent microtask. Tests that called
 * `signup()` then immediately fired `api(page, 'GET', '/something')`
 * sometimes read the token before it landed → 401 → spec fails. The
 * race surfaces as "API-only" flakes in specs that look like they don't
 * touch the browser. To eliminate it, we deterministically gate on:
 *   1. the POST itself returning success (arm waitForResponse BEFORE
 *      clicking submit so the listener can't miss a fast response),
 *   2. URL navigating off /signup, and
 *   3. an access token actually being readable from the httpOnly cookie.
 * No fixed sleeps; each step is a real event.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const first = page.getByLabel(/first name/i).first()
  if (await first.count().catch(() => 0)) await first.fill('Plume')
  const last = page.getByLabel(/last name/i).first()
  if (await last.count().catch(() => 0)) await last.fill('Tester')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const submit = page
    .getByRole('button', { name: /create.*account|sign\s*up|register|get\s*started/i })
    .first()
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
  // Force the lazy per-user seed to commit before signup() returns.
  // `ensureUserSeed` (api/src/handlers/me.ts) runs on the first
  // `GET /api/me/dashboard` and creates the welcome notifications,
  // seeded courses, assignments, and starter room. React redirects
  // post-signup to /dashboard, which fires that GET asynchronously —
  // but specs that read /notifications, /assignments, /rooms etc.
  // immediately after signup() race the seed. Deterministically wait
  // for the dashboard fetch to complete here, so callers can assume
  // seeded data is queryable. The handler is idempotent: it short-
  // circuits when the user already has rows.
  const token = await getAccessToken(page)
  if (token) {
    const seedResp = await page.request.get(`${API_BASE}/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(
      seedResp.status(),
      `GET /me/dashboard (seed trigger) → ${seedResp.status()}`,
    ).toBeLessThan(400)
  }
  return { email, password }
}

/**
 * Log an existing user in. Same hardening as `signup()`: deterministic
 * gates on the auth POST, the navigation away from /login, and the
 * presence of the token in the httpOnly cookie — no fixed sleeps.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email, input[type=email]').first().fill(email)
  await page.locator('input#password, input[type=password]').first().fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number; postData?: string | null }[] = []
  const onResp = async (resp: any) => {
    let postData: string | null = null
    try {
      postData = resp.request().postData()
    } catch {}
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      postData,
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

/** Fail the test if any console.error fires during fn (allowing benign noise). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_|Failed to load resource/i.test(e) &&
      !/Failed to fetch/i.test(e) &&
      !/TypeError: Load failed/i.test(e),
  )
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

export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('No accessToken in cookie — call signup() first')
  const segments = token.split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT')
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  const userId = payload.userId ?? payload.sub ?? payload.user_id
  if (!userId) throw new Error('JWT missing userId: ' + JSON.stringify(payload))
  return userId as string
}

/**
 * Issue an authenticated request through the page's session. Returns the
 * parsed JSON body. Use this to seed fixtures or read-after-write to verify
 * a backend invariant from a test.
 */
export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  expect(resp.status(), `${method} ${path} → ${resp.status()}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

/** Same as `api`, but returns the full Response so tests can assert specific status codes. */
export async function apiRaw(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
) {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  return page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
}
