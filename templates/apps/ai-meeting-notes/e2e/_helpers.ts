// Test helpers for ai-meeting-notes e2e specs.
//
// These run against the LIVE app + LIVE postgres + LIVE Stripe test
// keys + LIVE Mailgun sandbox. There are no upstream-API mocks; every
// spec exercises the actual integrations end-to-end.

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
export function uniqueEmail(prefix = 'amn'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  firstName: string
  lastName: string
}

/** Sign up a fresh user via the live /signup form. */
export async function signup(
  page: Page,
  optionsOrEmail: Partial<SignupResult> | string = {},
  passwordArg = 'TestPass123!',
): Promise<SignupResult> {
  // Accept either signup(page, { email, password, ... }) or the legacy
  // positional form signup(page, email, password) used by the older
  // grouped specs (01-auth, 03-meetings, etc.).
  const options: Partial<SignupResult> =
    typeof optionsOrEmail === 'string'
      ? { email: optionsOrEmail, password: passwordArg }
      : optionsOrEmail
  const email = options.email || uniqueEmail()
  const password = options.password || 'TestPass123!'
  const firstName = options.firstName || 'Avery'
  const lastName = options.lastName || `Tester${counter}`

  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const first = page.getByLabel(/first\s*name/i).first()
  if (await first.count().catch(() => 0)) await first.fill(firstName)
  const last = page.getByLabel(/last\s*name/i).first()
  if (await last.count().catch(() => 0)) await last.fill(lastName)
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
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
  return { email, password, firstName, lastName }
}

/** Log in an existing user. */
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
}

export async function logout(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
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

/** Sign up directly via the API (no browser). Returns token + userId. */
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

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** @deprecated Use getAccessToken(page) — reads the httpOnly token cookie. */
export async function getAccessTokenFromPage(page: Page): Promise<string | null> {
  return getAccessToken(page)
}

/** @deprecated [M1-1] The auth bearer token is no longer persisted to
 *  localStorage — it lives in the httpOnly `token` cookie set by the
 *  server. This function is a no-op and will be removed in a future pass.
 *  To pre-authenticate a test, call signup() or login() via the UI. */
export async function injectAuthToken(
  _page: Page,
  _token: string,
  _user: { id: string; email: string },
): Promise<void> {
  // no-op — localStorage auth keys are no longer read by the auth bond
}
