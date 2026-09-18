// Shared helpers for smart-home-dashboard e2e suite. All specs import from
// this file rather than re-rolling auth + network plumbing. Auth is real
// (POST /api/users + Bearer token), backend is the real Express + Postgres
// stack on $API_PORT, and the frontend at $VITE_PORT proxies /api →
// $API_PORT via vite.config.ts. No mocks.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3100')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4100') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'shd') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  name: string
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
 * Sign up a fresh user via the UI form. Drives the real /signup page.
 * The signup form uses placeholder-only inputs (FloatingInput).
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Smart Home Tester',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByPlaceholder(/email/i).first().fill(email)
  await page
    .getByPlaceholder(/password/i)
    .first()
    .fill(password)
  const nameField = page.getByPlaceholder(/your name/i)
  if (await nameField.count().catch(() => 0)) await nameField.fill(name)
  const submit = page.getByRole('button', { name: /^sign up$/i }).first()
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
    userId = body?.user?.id ?? body?.props?.id ?? body?.id
  } catch {
    /* non-JSON body — fall through to the cookie */
  }
  await expect(page).toHaveURL(/\/overview/, { timeout: 15000 })
  if (!accessToken) accessToken = (await getAccessToken(page)) ?? undefined
  return { email, password, name, accessToken, userId }
}

/**
 * Direct-to-API signup (no browser). Used by helpers that need a fresh
 * user but don't want to drive the UI.
 */
export async function apiSignup(request: APIRequestContext): Promise<SignupResult> {
  const email = uniqueEmail('apionly')
  const password = 'TestPass123!'
  const name = 'API Tester'
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'apiSignup failed').toBe(201)
  const body = await res.json()
  return {
    email,
    password,
    name,
    userId: body?.id ?? body?.user?.id,
    accessToken: body?.accessToken,
  }
}

/** Capture all responses fired during fn() — used to assert which network calls actually happened. */
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

/** Make an authenticated direct-to-API request with the captured Bearer token. */
export async function authedApi(request: APIRequestContext, token: string) {
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

/** Seed a single device for the signed-in user via the API. */
export async function seedDevice(
  request: APIRequestContext,
  token: string,
  overrides: Partial<{
    name: string
    type: string
    room: string | null
    manufacturer: string
  }> = {},
) {
  const api = await authedApi(request, token)
  const res = await api.post('/iot-devices', {
    name: overrides.name ?? `Living-room ceiling ${++counter}`,
    type: overrides.type ?? 'light',
    room: overrides.room ?? 'Living room',
    manufacturer: overrides.manufacturer ?? 'Acme',
  })
  expect(res.status(), 'seed device POST').toBe(201)
  return res.json()
}

/** Seed a single room for the signed-in user via the API. */
export async function seedRoom(request: APIRequestContext, token: string, name: string) {
  const api = await authedApi(request, token)
  const res = await api.post('/rooms', { name })
  expect(res.status(), 'seed room POST').toBe(201)
  return res.json()
}

/** Seed a single scene for the signed-in user via the API. */
export async function seedScene(
  request: APIRequestContext,
  token: string,
  overrides: Partial<{
    name: string
    description: string
    icon: string
    device_states: unknown[]
  }> = {},
) {
  const api = await authedApi(request, token)
  const res = await api.post('/scenes', {
    name: overrides.name ?? `Movie night ${++counter}`,
    description: overrides.description ?? '',
    icon: overrides.icon ?? 'movie',
    device_states: overrides.device_states ?? [],
  })
  expect(res.status(), 'seed scene POST').toBe(201)
  return res.json()
}

/** Seed a single automation for the signed-in user via the API. */
export async function seedAutomation(
  request: APIRequestContext,
  token: string,
  overrides: Partial<{
    name: string
    description: string
    enabled: boolean
    trigger: { type: string; value: unknown }
    actions: Array<{ type: string; target?: string }>
  }> = {},
) {
  const api = await authedApi(request, token)
  const res = await api.post('/automations', {
    name: overrides.name ?? `Sunset porch ${++counter}`,
    description: overrides.description ?? '',
    enabled: overrides.enabled ?? true,
    trigger: overrides.trigger ?? { type: 'time', value: 'sunset' },
    actions: overrides.actions ?? [{ type: 'notify', target: 'me' }],
  })
  expect(res.status(), 'seed automation POST').toBe(201)
  return res.json()
}

/** Fail the test if any console.error fires during fn — modulo benign noise. */
export async function expectNoFatalConsoleErrors(page: Page, fn: () => Promise<void>) {
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
