// Shared Playwright helpers for the lms e2e suite.
// Every spec file imports from this module; do not re-implement signup /
// login / api plumbing in the specs themselves.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'lms') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. The lms signup form has only
 * three fields (name, email, password) — no separate confirm.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test Student')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*up|create.*account|creating/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token in
  // localStorage AFTER nav. See virtual-classroom/_helpers.ts for the
  // auth-race rationale.
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
  return { email, password }
}

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

/** Capture all network responses during a block; useful for asserting the
 *  app actually called the API (and that it returned 2xx). */
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
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
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('No accessToken found — call signup() first')
  const segments = token.split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT')
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  const userId = payload.userId ?? payload.sub ?? payload.user_id
  if (!userId) throw new Error('JWT missing userId: ' + JSON.stringify(payload))
  return userId as string
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
 * Issue an authenticated request through the page's session. Returns the
 * parsed JSON body. Use this to seed fixtures (e.g. a course) or to
 * read-after-write to verify a backend invariant from a test.
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

/**
 * Same as `api`, but returns the full Response so callers can assert on
 * specific status codes (e.g. 401, 404). Used by negative tests.
 */
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
