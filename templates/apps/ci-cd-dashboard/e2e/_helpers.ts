// Shared helpers for ci-cd-dashboard e2e suite.
//
// All specs import from this file rather than re-rolling auth + network
// plumbing. Auth is real (POST /api/users + Bearer token), backend is the
// real Express + Postgres stack on $API_PORT, and the frontend at
// $VITE_PORT proxies /api → $API_PORT via vite.config.ts. No mocks.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'conduit') {
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
export async function getAuthCookieToken(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value
}

/**
 * Sign up a fresh user via the UI form. Drives the real /signup page so
 * the test exercises the same flow a human user takes. Lands on
 * /pipelines after a successful signup.
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for navigation off /signup. Eliminates the
 * API-only flake where a spec read the persisted JWT from localStorage
 * before the auth-state hook had a chance to write it.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Riley Test',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.getByLabel(/^Name$/i).fill(name)
  await page.getByLabel(/^Email$/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  await page.getByLabel(/Confirm password/i).fill(password)
  const submit = page.getByRole('button', { name: /Create account/i })
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
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  // Wait for the seeded data fetches to settle so subsequent navigations
  // see populated lists (pipelines/repos/envs).
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  if (!accessToken) accessToken = await getAuthCookieToken(page)
  return { email, password, name, accessToken, userId }
}

/**
 * Direct-to-API signup (no browser). Used when a test needs a fresh
 * user but doesn't want to navigate the UI.
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

/** Log in via the UI. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/^Email$/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  const submit = page.getByRole('button', { name: /^Sign in$/i })
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
 * calls actually happened (and their statuses).
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

/** Make an authenticated direct-to-API request with a Bearer token. */
export function authedApi(request: APIRequestContext, token: string) {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  return {
    get: (path: string) => request.get(API_BASE + path, { headers: auth }),
    post: (path: string, body?: unknown) =>
      request.post(API_BASE + path, { headers: auth, data: body ?? {} }),
    put: (path: string, body?: unknown) =>
      request.put(API_BASE + path, { headers: auth, data: body ?? {} }),
    patch: (path: string, body?: unknown) =>
      request.patch(API_BASE + path, { headers: auth, data: body ?? {} }),
    delete: (path: string) => request.delete(API_BASE + path, { headers: auth }),
  }
}

/**
 * Unwrap the `array | { items } | { <plural> }` list shapes these handlers
 * return.
 */
export function asList<T>(body: unknown, ...keys: string[]): T[] {
  if (Array.isArray(body)) return body as T[]
  const obj = (body ?? {}) as Record<string, unknown>
  for (const key of ['items', ...keys]) {
    if (Array.isArray(obj[key])) return obj[key] as T[]
  }
  return []
}

/**
 * A RegExp matching `text` literally, case-insensitively — for accessible-name
 * lookups whose expected value was read from the API instead of hardcoded.
 */
export function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

export interface EnvironmentRow {
  id: string
  name: string
}

/**
 * The environments the app shows, read from the endpoint the page reads.
 *
 * The starter repositories / environments / artifacts come from
 * `api/fixtures/*.json` — demo content an app's owner replaces — so specs
 * drive whatever the API actually returns rather than naming a seeded row.
 */
export async function listEnvironments(page: Page, token: string): Promise<EnvironmentRow[]> {
  const res = await authedApi(page.request, token).get('/environments')
  expect(res.status(), 'GET /api/environments').toBe(200)
  return asList<EnvironmentRow>(await res.json(), 'environments')
}

export interface ArtifactRow {
  id: string
  name: string
}

/** The artifacts the app shows, read from the endpoint the page reads. */
export async function listArtifacts(page: Page, token: string): Promise<ArtifactRow[]> {
  const res = await authedApi(page.request, token).get('/artifacts')
  expect(res.status(), 'GET /api/artifacts').toBe(200)
  return asList<ArtifactRow>(await res.json(), 'artifacts')
}

export interface RepositoryDetailRow {
  slug: string
  name: string
  default_branch?: string
  branches?: Array<{ name: string }>
}

/** One repository as the detail page reads it, branches included. */
export async function getRepository(
  page: Page,
  token: string,
  slug: string,
): Promise<RepositoryDetailRow> {
  const res = await authedApi(page.request, token).get('/repositories/' + slug)
  expect(res.status(), `GET /api/repositories/${slug}`).toBe(200)
  return (await res.json()) as RepositoryDetailRow
}

/** Get the first available pipeline id for the signed-in user. */
export async function getFirstPipelineId(page: Page): Promise<string> {
  await page.goto(APP_BASE + '/pipelines')
  const link = page.locator('a[href^="/pipelines/"]').first()
  await link.waitFor({ timeout: 10000 })
  const href = await link.getAttribute('href')
  return href!.replace(/^.*\/pipelines\//, '')
}

/** Get the first available repository slug for the signed-in user. */
export async function getFirstRepositorySlug(page: Page): Promise<string> {
  await page.goto(APP_BASE + '/repositories')
  const link = page.locator('a[href^="/repositories/"]').first()
  await link.waitFor({ timeout: 10000 })
  const href = await link.getAttribute('href')
  return href!.replace(/^.*\/repositories\//, '')
}
