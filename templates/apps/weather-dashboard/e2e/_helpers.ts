// Shared test helpers for the weather-dashboard Playwright suite. Every spec
// imports from this module rather than rewriting auth + network plumbing
// per-test. Mirrors the voting-polling pattern.

import { Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

/**
 * The app's brand name as rendered in the sidebar and nav.
 *
 * Centralised because this app was rebranded (Nimbus → Tempest) and the specs
 * kept matching the old name, so three tests hunted a brand the UI no longer
 * shows. Must track APP_NAME in app/src/branding.ts.
 */
export const BRAND = 'Tempest'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'wd-test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. Nimbus collects email + password
 * + (optional) name. After submit the app navigates to /dashboard via
 * AuthGuard.
 */
/**
 * Hardening (mirrors virtual-classroom): arm POST listener before click,
 * gate submit on enabled, assert response < 400, wait for nav off /signup,
 * then poll until accessToken is readable from localStorage. Eliminates an
 * auth-race where api(page, ...) calls immediately after signup() saw 401
 * because the auth-state hook hadn't persisted the JWT yet.
 */
export async function signup(
  page: Page,
  email = uniqueEmail('weather-dashboard'),
  password = 'TestPass123456!',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('input[type="text"]').fill('Walker')
  const submit = page.getByRole('button', { name: /sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /log\s*in/i }).first()
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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
 * Authenticated API request issued from the page session. Use for seeding
 * fixtures or read-after-write invariant checks. Aborts the test on >=400.
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

/** Same as `api` but returns the raw response so the test can assert non-2xx. */
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
  return await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
}

/**
 * Seed a saved location for the current user. Geocoding routes through
 * Nominatim, so use a well-known address to keep the test deterministic.
 */
export async function seedLocation(
  page: Page,
  opts: { name?: string; address: string; is_default?: boolean } = { address: 'London, UK' },
): Promise<{ id: string; name: string }> {
  return await api(page, 'POST', '/locations', {
    name: opts.name,
    address: opts.address,
    is_default: opts.is_default ?? false,
  })
}

/**
 * Capture network responses during a block. Returns method/url/status
 * tuples (plus the postData when present) so tests can assert
 * "POST /api/billing/checkout returned 2xx with priceId=…".
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number; requestBody: string | null }>> {
  const reqs: Array<{
    method: string
    url: string
    status: number
    requestBody: string | null
  }> = []
  const onResp = (resp: Response) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      requestBody: resp.request().postData(),
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
