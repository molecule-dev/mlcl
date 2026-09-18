// Shared helpers for price-comparison flagship e2e specs. Every spec
// imports from here rather than rewriting auth/network plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3200')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'sift') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  accessToken: string | null
  userId: string | null
  name: string
}

/**
 * Sign up a fresh user via the UI. The Bargain signup form has a single
 * "Display name" + email + password + confirm password. Returns the
 * credentials AND the JWT bearer token persisted to localStorage so
 * callers can drive `page.request.*` with bearer auth.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Avery Sift',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#name').fill(name)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#confirm').fill(password)
  const submit = page.getByRole('button', { name: /create.*account|sign.*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
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
  const accessToken = await getAccessToken(page)
  const meRes = await page.request.get(API_BASE + '/users/me')
  const meBody = meRes.ok()
    ? ((await meRes.json()) as { props?: { id?: string }; id?: string })
    : null
  const userId = meBody?.props?.id ?? meBody?.id ?? null
  return { email, password, accessToken, userId, name }
}

/**
 * Become the catalog operator for the current (already-authed) session.
 *
 * The shared-catalog writes (product create/update/delete + the demo seed,
 * source CRUD + manual fetch, price-entry writes, and the price-fetch /
 * alert-evaluation cron installers) are gated behind `requireAdmin`, which
 * reads `users.role` — a column that defaults to the non-operator 'user' on a
 * fresh signup. This calls the dev-only `POST /api/_test/promote-admin`
 * endpoint (404 in production; served only when `ENABLE_E2E_TEST_ENDPOINTS=true`,
 * which the harness sets) to elevate the caller's OWN row to `role = 'admin'`.
 * So an operator e2e flow signs up a fresh user and then becomes the operator —
 * exercising the real operator surfaces without weakening the gate for ordinary
 * users.
 */
export async function promoteToAdmin(page: Page, accessToken?: string | null): Promise<void> {
  const token = accessToken ?? (await getAccessToken(page))
  const res = await page.request.post(`${API_BASE}/_test/promote-admin`, {
    headers: authHeaders(token),
    failOnStatusCode: false,
  })
  expect(res.status(), `POST /api/_test/promote-admin → ${res.status()}`).toBeLessThan(400)
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear())
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
    })
  }
  page.on('response', onResp as Parameters<typeof page.on>[1])
  try {
    await fn()
  } finally {
    page.off('response', onResp as Parameters<typeof page.on>[1])
  }
  return reqs
}

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler as Parameters<typeof page.on>[1])
  try {
    await fn()
  } finally {
    page.off('console', handler as Parameters<typeof page.on>[1])
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface ApiProduct {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  price?: number
  best_price?: number | null
  best_source?: string | null
  status?: string
  slug?: string
}

export interface ApiSource {
  id: string
  slug: string
  name: string
}

/**
 * Trigger the idempotent products seed if catalog is empty.
 *
 * `POST /api/products/seed` is gated behind `requireAdmin` (the demo catalog is
 * system-owned, so only an operator may seed it), and a freshly-signed-up user
 * is `role = 'user'`. So promote the caller to the operator first — every spec
 * that needs catalog data signs up a fresh user and then seeds, so the
 * promotion belongs here, immediately before the first gated write, rather than
 * being duplicated into each spec. Promotion only succeeds when the harness has
 * set `ENABLE_E2E_TEST_ENDPOINTS=true`; the gate itself is never weakened.
 */
export async function seedCatalog(page: Page, accessToken: string | null): Promise<void> {
  await promoteToAdmin(page, accessToken)
  const res = await page.request.post(`${API_BASE}/products/seed`, {
    headers: authHeaders(accessToken),
    data: {},
    failOnStatusCode: false,
  })
  expect([200, 201].includes(res.status()), await res.text().catch(() => '')).toBe(true)
}

export async function listProducts(page: Page, accessToken: string | null): Promise<ApiProduct[]> {
  const res = await page.request.get(`${API_BASE}/products?limit=200`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as ApiProduct[] | { data: ApiProduct[] }
  return Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
}

export async function listAlerts(
  page: Page,
  accessToken: string | null,
): Promise<Array<{ id: string; product_id: string; target_price: number; status: string }>> {
  const res = await page.request.get(`${API_BASE}/alerts`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as
    | Array<{ id: string; product_id: string; target_price: number; status: string }>
    | { data: Array<{ id: string; product_id: string; target_price: number; status: string }> }
  return Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
}

export async function listWatchlist(
  page: Page,
  accessToken: string | null,
): Promise<Array<{ id: string; product_id: string }>> {
  const res = await page.request.get(`${API_BASE}/watchlist`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as
    Array<{ id: string; product_id: string }> | { data: Array<{ id: string; product_id: string }> }
  return Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
}

export async function listNotifications(
  page: Page,
  accessToken: string | null,
): Promise<Array<{ id: string; type: string; payload: Record<string, unknown> }>> {
  const res = await page.request.get(`${API_BASE}/notifications`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as {
    data: Array<{ id: string; type: string; payload: Record<string, unknown> }>
    unread: number
  }
  return Array.isArray(body.data) ? body.data : []
}

export async function getMe(
  page: Page,
  accessToken: string | null,
  userId: string | null,
): Promise<{ id: string; name?: string; oauthData?: Record<string, unknown> }> {
  const res = await page.request.get(`${API_BASE}/users/${userId}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as
    | { props: { id: string; name?: string; oauthData?: Record<string, unknown> } }
    | { id: string; name?: string; oauthData?: Record<string, unknown> }
  return 'props' in body ? body.props : body
}
