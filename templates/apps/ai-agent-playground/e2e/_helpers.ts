// Shared helpers for ai-agent-playground (Neuron) e2e suite.
//
// All specs import from this file rather than re-rolling auth + network
// plumbing. Auth is real (POST /api/users + Bearer token), backend is
// the real Express + Postgres stack on $API_PORT, and the frontend at
// $VITE_PORT proxies /api → $API_PORT via vite.config.ts. No mocks.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'neuron') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  userId?: string
  accessToken?: string
}

/**
 * Pull the persisted JWT and the signed-in user's id out of the browser
 * storage. The molecule auth client persists JSON containing both the
 * token and a wrapped user; format varies by adapter so we probe several
 * shapes.
 */
async function readAuthFromStorage(page: Page): Promise<{ token?: string; userId?: string }> {
  return page.evaluate(() => {
    let token: string | undefined
    let userId: string | undefined
    for (const key of Object.keys(window.localStorage)) {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      if (!token && /accesstoken|jwt|token/i.test(key) && raw.split('.').length === 3) {
        token = raw
      }
      if (!userId && /user|profile/i.test(key)) {
        try {
          const parsed = JSON.parse(raw)
          userId = parsed?.id ?? parsed?.user?.id ?? parsed?.props?.id
        } catch {
          // not JSON; ignore
        }
      }
    }
    return { token, userId }
  })
}

/**
 * Sign up a fresh user via the UI form. Drives the real /signup page so
 * the test exercises the same flow a human user takes.
 *
 * The JWT is read from the signup POST **response body** — the canonical,
 * adapter-independent source. This app intentionally keeps the bearer token
 * in memory (see app `config.ts`: `storage` is omitted so the token is NOT
 * mirrored into localStorage — an XSS-exfiltratable localStorage copy would
 * defeat the httpOnly session cookie). So `localStorage` is empty by design
 * and is only a best-effort fallback for adapters that DO persist there.
 * The register handler returns `{ props, accessToken, user }` (see
 * `@molecule/api-resource-user` `create.ts`), so we capture both the token
 * and the user id straight from that response.
 *
 * Hardened against the auth-race: the listener is armed BEFORE the click and
 * we gate on the POST response, the navigation to /dashboard, and finally the
 * parsed body — never racing a microtask that writes storage later.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-mol-id="signup-email"]').fill(email)
  await page.locator('[data-mol-id="signup-password"]').fill(password)
  const submit = page.locator('[data-mol-id="signup-submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 })

  // Primary source: the register response body ({ props, accessToken, user }).
  let token: string | undefined
  let userId: string | undefined
  try {
    const body = await resp.json()
    token = body?.accessToken
    userId = body?.user?.id ?? body?.props?.id ?? body?.id
  } catch {
    // body already consumed / not JSON — fall through to storage probe
  }

  // Fallback for auth adapters that DO persist to localStorage.
  if (!token || !userId) {
    const fromStorage = await readAuthFromStorage(page)
    token = token ?? fromStorage.token
    userId = userId ?? fromStorage.userId
  }

  return { email, password, accessToken: token, userId }
}

/**
 * Direct-to-API signup (no browser). Used inside helpers that need a
 * fresh user but do not want to navigate the UI yet.
 */
export async function apiSignup(request: APIRequestContext): Promise<SignupResult> {
  const email = uniqueEmail('apionly')
  const password = 'TestPass123!'
  const res = await request.post(API_BASE + '/users', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'apiSignup failed').toBe(201)
  const body = await res.json()
  return {
    email,
    password,
    userId: body?.id ?? body?.user?.id,
    accessToken: body?.accessToken,
  }
}

/**
 * Log in via the UI. Rarely needed — tests typically call signup() and
 * then continue. Use only for sessions / token rotation tests.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('[data-mol-id="login-email"]').fill(email)
  await page.locator('[data-mol-id="login-password"]').fill(password)
  const submit = page.locator('[data-mol-id="login-submit"]')
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

/**
 * Capture all responses fired during fn() — used to assert which network
 * calls actually happened (and their statuses). Crucial for the "did
 * the action have a real backend effect?" question.
 */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

/** Filter captured requests to those that hit /api/<path> (any verb). */
export function whereUrl(
  reqs: ReadonlyArray<{ method: string; url: string; status: number }>,
  pathRegex: RegExp,
  method?: string,
) {
  return reqs.filter(
    (r) =>
      pathRegex.test(r.url) && (method ? r.method.toUpperCase() === method.toUpperCase() : true),
  )
}

/**
 * Make an authenticated direct-to-API request with the captured Bearer
 * token. Use to verify backend invariants (read-after-write).
 */
export function authedApi(request: APIRequestContext, token: string) {
  return {
    get: (path: string) =>
      request.get(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
    post: (path: string, body: unknown) =>
      request.post(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    put: (path: string, body: unknown) =>
      request.put(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    delete: (path: string) =>
      request.delete(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
  }
}

/**
 * Seed a single agent for the signed-in user. Returns the row so tests
 * can navigate to /agents/:id and assert the data renders.
 */
export async function seedAgent(
  request: APIRequestContext,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const api = authedApi(request, token)
  const res = await api.post('/agents', {
    name: `Test Agent ${++counter}`,
    description: 'Smoke test agent',
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    temperature: 0.5,
    max_tokens: 256,
    system_prompt: 'You are a test agent. Reply briefly.',
    tools_config: [],
    status: 'draft',
    ...overrides,
  })
  expect(res.status(), 'seedAgent POST').toBe(201)
  return res.json()
}

/** Fail the test if any console.error fires during fn — modulo benign noise. */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler as never)
  try {
    await fn()
  } finally {
    page.off('console', handler as never)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_INSUFFICIENT_RESOURCES|Failed to load resource|the server responded with a status of 4\d\d/.test(
        e,
      ),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
