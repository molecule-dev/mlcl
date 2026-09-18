/**
 * Test helpers for spreadsheet e2e specs. Drives the LIVE app + LIVE
 * postgres + LIVE Stripe test keys + LIVE Mailgun sandbox. There are no
 * upstream-API mocks; every spec exercises the actual integrations.
 */

import {
  type APIRequestContext,
  type ConsoleMessage,
  type Page,
  type Response,
  expect,
  request,
} from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'sheet'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  name: string
  userId?: string
  token?: string
}

/** Sign up a fresh user via the live /signup form.
 *
 * Deterministic gating: arm POST /api/users BEFORE the click (so a fast
 * response can't be missed), assert < 400, wait for nav off /signup,
 * then poll until the JWT lands in localStorage. Without this, specs
 * that fire page.request.* immediately after signup() sometimes read a
 * stale empty token because React routes the moment POST resolves but
 * the auth-state hook persists the JWT in a subsequent microtask
 * → 401 → "flaky". */
export async function signup(
  page: Page,
  optionsOrEmail: Partial<SignupResult> | string = {},
  passwordArg = 'TestPass123!',
): Promise<SignupResult> {
  const options: Partial<SignupResult> =
    typeof optionsOrEmail === 'string'
      ? { email: optionsOrEmail, password: passwordArg }
      : optionsOrEmail
  const email = options.email || uniqueEmail()
  const password = options.password || 'TestPass123!'
  const name = options.name || `Tester${counter}`

  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const nameField = page.getByLabel(/full name|^name$/i).first()
  if (await nameField.count().catch(() => 0)) await nameField.fill(name)
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const submit = page
    .getByRole('button', { name: /create.*workspace|create.*account|sign\s*up|register/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

/** Log in an existing user via the live /login form. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password)
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

/** Sign up directly via the API (no browser) and return token + userId. */
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
    accessToken?: string
    user?: { id: string }
    props?: { id: string }
    id?: string
  }
  const userId = body.user?.id ?? body.props?.id ?? body.id ?? ''
  if (!userId || !body.accessToken) {
    throw new Error(
      `apiSignup: missing accessToken/userId in ${JSON.stringify(body).slice(0, 200)}`,
    )
  }
  return { token: body.accessToken, userId, email, password }
}

/** Helper for getting an access token from email/password (re-login flow). */
export async function apiLogin(email: string, password: string): Promise<string> {
  const res = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`apiLogin failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { accessToken: string }
  return json.accessToken
}

/** [M1-1] The bearer token is held in memory (a localStorage copy is
 * XSS-exfiltratable); the persistent credential is the httpOnly `token`
 * cookie (prod: `__Host-token`), readable in tests via the Playwright
 * context. Its value IS the JWT.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export interface CapturedReq {
  method: string
  url: string
  status: number
}

/** Capture all network responses during fn. */
export async function captureNetwork(page: Page, fn: () => Promise<void>): Promise<CapturedReq[]> {
  const reqs: CapturedReq[] = []
  const onResp = (resp: Response) => {
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

/** Fail if any console.error fires during fn (allowing benign noise). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>): Promise<void> {
  const errs: string[] = []
  const handler = (msg: ConsoleMessage) => {
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

/** Acquire a fresh API context for backend invariant checks. */
export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext()
}
