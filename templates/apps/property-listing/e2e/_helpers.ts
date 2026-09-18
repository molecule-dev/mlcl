// Test helpers for property-listing e2e specs.
//
// These run against the LIVE app + LIVE postgres. There are no
// upstream-API mocks; every spec exercises the actual integrations
// end-to-end so a green suite proves the full stack works on a fresh
// scaffold.

import { Page, expect, type APIRequestContext, request } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'agent'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  firstName: string
  lastName: string
}

/**
 * Sign up a fresh user via the live /signup form. Returns the email +
 * password used so subsequent specs can re-login if needed.
 */
export async function signup(
  page: Page,
  options: Partial<SignupResult> = {},
): Promise<SignupResult> {
  const email = options.email || uniqueEmail()
  const password = options.password || 'TestPass123!'
  const firstName = options.firstName || 'Avery'
  const lastName = options.lastName || `Tester${counter}`

  await page.goto(APP_BASE + '/signup')
  const inputs = page.locator('input').filter({ visible: true })
  // First name (text), last name (text), email, password, confirm.
  await inputs.nth(0).fill(firstName)
  await inputs.nth(1).fill(lastName)
  await inputs.nth(2).fill(email)
  await inputs.nth(3).fill(password)
  await inputs.nth(4).fill(password)
  const submit = page.getByRole('button', { name: /create account|sign\s*up|register/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER
  // nav (auth-state hook persists JWT in a microtask after React routes).
  // See virtual-classroom/_helpers.ts for full rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessTokenFromPage(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, firstName, lastName }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  const inputs = page.locator('input').filter({ visible: true })
  await inputs.nth(0).fill(email)
  await inputs.nth(1).fill(password)
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
    .poll(async () => (await getAccessTokenFromPage(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export interface CapturedReq {
  method: string
  url: string
  status: number
}

export async function captureNetwork(page: Page, fn: () => Promise<void>): Promise<CapturedReq[]> {
  const reqs: CapturedReq[] = []
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

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>): Promise<void> {
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
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|aborted|signal aborted/i.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}

/**
 * Acquire an API access token by signing up a fresh user directly
 * against the API. Useful for backend invariant checks that don't
 * require a browser.
 */
export async function apiSignup(
  ctx: APIRequestContext,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'API Tester',
): Promise<{ token: string; userId: string; email: string; password: string }> {
  const resp = await ctx.post(`${API_BASE}/users`, { data: { email, password, name } })
  if (!resp.ok()) {
    throw new Error(`apiSignup failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = (await resp.json()) as {
    accessToken: string
    user?: { id: string }
    props?: { id: string }
    id?: string
  }
  const userId = body.user?.id ?? body.props?.id ?? body.id ?? ''
  if (!userId || !body.accessToken) {
    throw new Error(
      `apiSignup: missing accessToken or userId in ${JSON.stringify(body).slice(0, 200)}`,
    )
  }
  return { token: body.accessToken, userId, email, password }
}

export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext()
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

/** @deprecated Use getAccessToken instead */
export async function getAccessTokenFromPage(page: Page): Promise<string | null> {
  return getAccessToken(page)
}

/**
 * The public properties endpoint may return either a flat list or
 * `{ data: [...], total }`. Normalise to an array.
 */
export function unwrapList<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const inner = (payload as { data?: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown[] }).data)) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}
