// Test helpers for rental-marketplace e2e specs.
//
// These run against the LIVE app + LIVE postgres + LIVE Stripe test
// keys + LIVE Mailgun sandbox. There are no upstream-API mocks; every
// spec is exercising the actual integrations end-to-end.

import { Page, expect, type APIRequestContext, request } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'roost'): string {
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
  // First/last name are above email + password in the form.
  const inputs = page.locator('input').filter({ visible: true })
  // First name (text), last name (text), email, password, confirm.
  await inputs.nth(0).fill(firstName)
  await inputs.nth(1).fill(lastName)
  await inputs.nth(2).fill(email)
  await inputs.nth(3).fill(password)
  await inputs.nth(4).fill(password)
  const submit = page.getByRole('button', { name: /create account|sign\s*up|register/i }).first()
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
  return { email, password, firstName, lastName }
}

/** Log in an existing user via the live /login form. */
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
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

/**
 * Capture all network responses during `fn`. The returned array is
 * useful for asserting the action actually called the API (vs. a stub
 * that only updated local UI state).
 */
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

/**
 * Fail if any console.error fires during `fn` (allowing common
 * benign noise like favicon 404s and dev-server abort messages).
 */
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
 * against the API. Returns { token, userId, email, password }. Useful
 * for backend invariant checks that don't require a browser.
 */
export async function apiSignup(
  ctx: APIRequestContext,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'API Tester',
): Promise<{ token: string; userId: string; email: string; password: string }> {
  const resp = await ctx.post(`${API_BASE}/users`, {
    data: { email, password, name },
  })
  if (!resp.ok()) {
    throw new Error(`apiSignup failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = (await resp.json()) as {
    accessToken: string
    user?: { id: string }
    props?: { id: string }
    id?: string
  }
  // The Molecule users endpoint returns the new user under `props`
  // (resource model). Some templates flatten to top-level `id` or
  // `user`. Accept whichever shape is present.
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

/** A listing row in the shape the search + landing pages read. */
export interface CatalogListing {
  id: string
  title: string
  city?: string
  country?: string
  price_per_night_cents: number
  amenities?: string[]
}

/**
 * The listings the app actually serves. Specs read the catalog they drive from
 * the same endpoint the pages read, so they still hold once the demo listings
 * are replaced.
 */
export async function getListings(page: Page): Promise<CatalogListing[]> {
  const r = await page.request.get(`${API_BASE}/listings`)
  expect(r.ok(), `GET ${API_BASE}/listings failed`).toBeTruthy()
  const body = (await r.json()) as { data: CatalogListing[] }
  return body.data ?? []
}

/**
 * The signed-in user's bookmarks, with at least one guaranteed — created
 * through the same POST /api/bookmarks the card heart fires. Never assumes the
 * demo seed left a saved stay behind.
 */
export async function ensureBookmark(page: Page): Promise<Array<{ listing_id: string }>> {
  const read = async (): Promise<Array<{ listing_id: string }>> => {
    const r = await page.request.get(`${API_BASE}/bookmarks`)
    expect(r.ok(), 'GET /api/bookmarks').toBeTruthy()
    const body = (await r.json()) as { data: Array<{ listing_id: string }> }
    return body.data ?? []
  }
  const existing = await read()
  if (existing.length > 0) return existing
  const listings = await getListings(page)
  const first = listings[0]
  if (!first) throw new Error('catalog is empty — nothing to bookmark')
  const post = await page.request.post(`${API_BASE}/bookmarks`, {
    data: { listing_id: first.id },
  })
  expect(post.status(), 'POST /api/bookmarks').toBe(201)
  const after = await read()
  expect(after.length, 'bookmark did not persist').toBeGreaterThan(0)
  return after
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

/** @deprecated M1-1: auth token is now an httpOnly cookie set by the server;
 * localStorage seeding has no effect. Use signup() or login() to establish an
 * authenticated session — the server sets the cookie automatically. */
export async function injectAuthToken(
  _page: Page,
  _token: string,
  _user: { id: string; email: string },
): Promise<void> {
  // No-op: the bearer token is now an httpOnly cookie set server-side.
  // Seeding localStorage no longer establishes an auth session.
}
