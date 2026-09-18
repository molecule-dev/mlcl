// Shared helpers for music-daw e2e suite.
//
// All specs import from this file rather than re-rolling auth + network
// plumbing. Auth is real (POST /api/users + Bearer token), backend is
// the real Express + Postgres + Stripe + Mailgun stack on $API_PORT,
// and the frontend at $VITE_PORT proxies /api → $API_PORT via vite.config.ts.
// No mocks for upstream APIs.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3030')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4030') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'fugue') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export function uniqueHandle(prefix = 'producer') {
  return `${prefix}-${Date.now()}-${++counter}`
}

export interface SignupResult {
  email: string
  password: string
  firstName: string
  lastName: string
  handle: string
  userId?: string
  accessToken?: string
}

/**
 * Read the bearer JWT from the auth cookie. [M1-1] The token is held in
 * memory + an httpOnly `token` cookie (prod: `__Host-token`); it is no
 * longer persisted to localStorage (that copy was XSS-exfiltratable). The
 * cookie value IS the JWT and is readable in tests via the Playwright
 * context.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/**
 * Sign up a fresh user via the UI form. Drives the real /signup page so
 * the test exercises the same flow a human producer would take.
 */
export async function signup(
  page: Page,
  opts: Partial<{
    email: string
    password: string
    firstName: string
    lastName: string
    handle: string
  }> = {},
): Promise<SignupResult> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass123!'
  const firstName = opts.firstName ?? 'Aria'
  const lastName = opts.lastName ?? 'Vega'
  const handle = opts.handle ?? uniqueHandle()
  await page.goto(APP_BASE + '/signup')
  await page.locator('#signup-first').fill(firstName)
  await page.locator('#signup-last').fill(lastName)
  await page.locator('#signup-handle').fill(handle)
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(password)
  await page.locator('#signup-confirm').fill(password)
  // Hardening: gate on submit-enabled, arm the POST /api/users response
  // listener BEFORE the click, then poll until the JWT lands in the
  // httpOnly `token` cookie. Eliminates a race where the token was read
  // before the molecule auth hook had set the cookie, so the returned
  // `accessToken` was undefined and authed APIRequestContext calls 401-ed.
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  // [M1-1] The JWT is no longer in localStorage. Capture it from the
  // create+logIn response body — the @molecule/api-resource-user create
  // handler returns `{ props, accessToken, user }` — falling back to the
  // httpOnly `token` cookie.
  let accessToken: string | undefined
  let userId: string | undefined
  try {
    const body = await resp.json()
    accessToken = body?.accessToken
    userId = body?.props?.id ?? body?.id ?? body?.user?.id
  } catch {
    /* non-JSON body — fall through to the cookie */
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  if (!accessToken) accessToken = (await getAccessToken(page)) ?? undefined
  return { email, password, firstName, lastName, handle, accessToken, userId }
}

/**
 * Direct-to-API signup (no browser). Used inside helpers that need a fresh
 * user but do not want to drive the UI.
 */
export async function apiSignup(request: APIRequestContext): Promise<SignupResult> {
  const email = uniqueEmail('apionly')
  const password = 'TestPass123!'
  const firstName = 'API'
  const lastName = 'Tester'
  const handle = uniqueHandle('api')
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name: `${firstName} ${lastName}` },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'apiSignup failed').toBe(201)
  const body = await res.json()
  return {
    email,
    password,
    firstName,
    lastName,
    handle,
    userId: body?.props?.id ?? body?.id ?? body?.user?.id,
    accessToken: body?.accessToken,
  }
}

/**
 * Log in via the UI. Rarely needed — tests typically call signup() and
 * then continue. Use for sessions / token rotation tests.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.getByRole('button', { name: /open the studio|sign\s*in|signing in/i })
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
  // [M1-1] Poll the httpOnly `token` cookie rather than localStorage.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Capture all responses fired during fn() — used to assert which network
 * calls actually happened (and their statuses). Crucial for the
 * "did the action have a real backend effect?" question.
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

/** Filter captured requests to those that hit a /api/<path> matching pathRegex. */
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
    post: (path: string, body?: unknown) =>
      request.post(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body ?? {},
      }),
    put: (path: string, body: unknown) =>
      request.put(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    patch: (path: string, body: unknown) =>
      request.patch(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    delete: (path: string) =>
      request.delete(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
  }
}

/**
 * Create a fresh project for the signed-in user via the API. Returns the
 * created project row (id, name, bpm, etc.).
 */
export async function createProject(
  request: APIRequestContext,
  token: string,
  opts: Partial<{ name: string; bpm: number; time_signature: string }> = {},
) {
  const api = authedApi(request, token)
  const res = await api.post('/projects', {
    name: opts.name ?? `Track ${Date.now()}`,
    bpm: opts.bpm ?? 124,
    time_signature: opts.time_signature ?? '4/4',
  })
  expect(res.status(), 'create project').toBe(201)
  return (await res.json()) as { id: string; name: string; bpm: number; time_signature: string }
}

/** Add an audio track to a project via the API. */
export async function addTrack(
  request: APIRequestContext,
  token: string,
  projectId: string,
  opts: Partial<{ name: string; type: 'audio' | 'midi' | 'aux' }> = {},
) {
  const api = authedApi(request, token)
  const res = await api.post('/tracks', {
    project_id: projectId,
    name: opts.name ?? 'Bass',
    type: opts.type ?? 'audio',
  })
  expect(res.status(), 'add track').toBe(201)
  return (await res.json()) as {
    id: string
    project_id: string
    name: string
    type: string
    volume: string | number
    pan: string | number
    muted: boolean
    solo: boolean
  }
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
      !/favicon|net::ERR_|Failed to load resource|the server responded with a status of 4\d\d/.test(
        e,
      ),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
