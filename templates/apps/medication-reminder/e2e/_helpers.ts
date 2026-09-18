// Shared test helpers for the medication-reminder Playwright suite.
//
// medication-reminder's signup form has three fields (email / password /
// optional name) and uses placeholder-as-label inputs (no `<label htmlFor>`
// pairing). We target inputs by `type` and the submit button by name.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'med'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. After submit the app navigates
 * to / (Landing) — but the AuthGuard treats the user as authenticated so
 * /dashboard becomes accessible. We assert we're off /signup, then leave the
 * caller to navigate where it needs.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
): Promise<{ email: string; password: string; name: string }> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Name field is the only `type="text"` input on the form.
  const nameField = page.locator('input[type="text"]').first()
  if ((await nameField.count()) > 0) await nameField.fill(name)
  const submit = page.getByRole('button', { name: /^sign up$/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  return { email, password, name }
}

/**
 * Log in an already-signed-up user. Lands on /dashboard or wherever
 * AuthGuard redirected from.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /^log in$/i }).first()
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
 * Decode the userId out of the authorization JWT bearer header that the
 * molecule auth bond stores in an httpOnly cookie.
 */
export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('No accessToken found — call signup() first')
  const segments = String(token).split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT: ' + String(token).slice(0, 40))
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  if (!payload.userId) throw new Error('JWT has no userId field: ' + JSON.stringify(payload))
  return payload.userId as string
}

/**
 * Capture all network responses during `fn`. Useful for asserting that the
 * UI actually fired the API call we expect (and that it returned 2xx).
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
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

/**
 * Issue an authenticated request through the page's session cookies +
 * Authorization header. Returns the parsed JSON body. Use this to seed
 * fixtures (a medication, a refill request) before navigating to a page
 * under test.
 */
/**
 * Auto-unwrap `{ data: ... }` envelopes that the resource layer wraps responses
 * in. Custom handlers (medications/doses/refills/etc.) return raw shapes.
 * Resource endpoints (users, devices, billing) wrap them. We accept both so
 * callers don't have to care.
 */
function unwrapEnvelope<T>(parsed: unknown): T {
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'data' in parsed &&
    Object.keys(parsed as object).length <= 4
  ) {
    const inner = (parsed as { data: unknown }).data
    if (inner !== undefined) return inner as T
  }
  return parsed as T
}

export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const cookies = await page.context().cookies()
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (cookieStr) headers['Cookie'] = cookieStr
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
  expect(resp.status(), `${method} ${path}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return unwrapEnvelope<T>(JSON.parse(text))
  } catch {
    return text as T
  }
}

/**
 * Like `api()` but returns the full response so the caller can inspect
 * non-2xx status codes (used for tests that *assert* an unauthorized or
 * forbidden response).
 */
export async function rawApi(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<{ status: number; body: unknown }> {
  const cookies = await page.context().cookies()
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (cookieStr) headers['Cookie'] = cookieStr
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
  const status = resp.status()
  if (status === 204) return { status, body: null }
  const text = await resp.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status, body }
}

/**
 * Convenience: signup then create a medication with a single 8 AM dose
 * scheduled for today + the next 14 days. Returns the medication object
 * the API returned (already projected for the frontend shape).
 */
export async function signUpWithMedication(
  page: Page,
  name = `Lisinopril ${Date.now()}`,
): Promise<{ email: string; password: string; medication: Record<string, unknown> }> {
  const creds = await signup(page)
  const medication = await api<Record<string, unknown>>(page, 'POST', '/medications', {
    name,
    dose_amount: '10 mg',
    pill_color: 'blue',
    schedule_summary: 'Every morning at 8',
    schedule_times: ['08:00'],
    pharmacy: 'CVS Main St',
    warnings: ['Take with food'],
  })
  return { email: creds.email, password: creds.password, medication }
}

/**
 * Backward-compatible wrapper: use `page.request` directly so callers can
 * ship request-context-only tests (no page yet).
 */
export async function rawRequest<T = unknown>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  bearer?: string,
  data?: unknown,
): Promise<{ status: number; body: T | string | null }> {
  const headers: Record<string, string> = {}
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  const status = resp.status()
  if (status === 204) return { status, body: null }
  const text = await resp.text()
  try {
    return { status, body: JSON.parse(text) as T }
  } catch {
    return { status, body: text }
  }
}
