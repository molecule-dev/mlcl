// Shared test helpers for the video-conferencing Playwright suite.
//
// The signup form has 6 fields (workspace name, first/last name, email,
// password, confirm password) wired to local state. The auth bond stores
// the access token in an httpOnly cookie (M1-1).

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'vc'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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
 * Sign up a fresh user via the Signup form. Lands on /dashboard.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  firstName = 'Test',
  lastName = 'User',
  workspace = 'Test Workspace',
): Promise<{
  email: string
  password: string
  firstName: string
  lastName: string
  workspace: string
}> {
  await page.goto(APP_BASE + '/signup')
  await page.getByRole('textbox', { name: /workspace name/i }).fill(workspace)
  await page.getByRole('textbox', { name: /first name/i }).fill(firstName)
  await page.getByRole('textbox', { name: /last name/i }).fill(lastName)
  await page.getByRole('textbox', { name: /work email/i }).fill(email)
  await page.getByRole('textbox', { name: /^password$/i }).fill(password)
  await page.getByRole('textbox', { name: /confirm password/i }).fill(password)
  // Hardening: gate on submit-enabled, arm the POST /api/users response
  // listener BEFORE the click, then poll until the JWT lands in the httpOnly
  // cookie. Eliminates a race where the auth-state hook persisted the token
  // in a microtask AFTER React routed to /dashboard.
  const submit = page.getByRole('button', { name: /create workspace/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, firstName, lastName, workspace }
}

/**
 * Log in an already-signed-up user. Lands on /dashboard or wherever
 * AuthGuard redirected from.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /work email/i }).fill(email)
  await page.getByRole('textbox', { name: /^password$/i }).fill(password)
  const submit = page.getByRole('button', { name: /^sign in$/i })
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
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Decode the userId out of the molecule auth bond JWT bearer token.
 */
export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
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
 * Auto-unwrap `{ data: ... }` envelopes that the resource layer wraps
 * responses in. Custom video-conferencing handlers return raw shapes;
 * resource endpoints (users/devices) wrap them. Accept both.
 */
function unwrapEnvelope<T>(parsed: unknown): T {
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>
    // User resource wraps in { props, twoFactorEnabled, hasPendingTwoFactor }.
    if ('props' in obj && obj.props !== null && typeof obj.props === 'object') {
      return obj.props as T
    }
    // Most resource handlers wrap in { data: ... }.
    if ('data' in obj && obj.data !== undefined && Object.keys(obj).length <= 4) {
      return obj.data as T
    }
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
 * Convenience: signup then create a meeting starting in `inMinutes` minutes
 * lasting `durationMinutes` minutes. Returns the created meeting row from
 * POST /api/meetings.
 */
export async function signUpWithMeeting(
  page: Page,
  title = `Test meeting ${Date.now()}`,
  inMinutes = 30,
  durationMinutes = 30,
  inviteEmails: string[] = [],
): Promise<{
  email: string
  password: string
  meeting: { id: string; title: string; join_code: string; starts_at?: string; ends_at?: string }
}> {
  const creds = await signup(page)
  const startsAt = new Date(Date.now() + inMinutes * 60_000).toISOString()
  const endsAt = new Date(Date.now() + (inMinutes + durationMinutes) * 60_000).toISOString()
  const meeting = await api<{
    id: string
    title: string
    join_code: string
    starts_at?: string
    ends_at?: string
  }>(page, 'POST', '/meetings', {
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    invite_emails: inviteEmails.length ? inviteEmails : undefined,
  })
  return { email: creds.email, password: creds.password, meeting }
}

/**
 * Backward-compatible request-context wrapper for tests that don't have
 * a page yet.
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
