// Shared helpers for the investment-portfolio flagship e2e suite.
//
// Every spec imports from here rather than rewriting auth/network
// plumbing per-test. Designed for the multi-app smoke runner where
// many flagships share the same workspace — APP_BASE/API_BASE both
// honor per-app VITE_PORT/API_PORT env vars set by the runner.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'ip') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  name: string
  accessToken: string | null
  userId: string | null
}

/** Sign up via the UI — the only way the auth bond's localStorage
 *  hydrates correctly so subsequent requests carry the bearer token. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="name"]').first().fill(name)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /create account|sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // See virtual-classroom/_helpers.ts for the auth-race rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(`${API_BASE}/users/me`)
  let userId: string | null = null
  if (userRes.ok()) {
    const me = (await userRes.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  return { email, password, name, accessToken, userId }
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

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface ApiTransaction {
  id: string
  symbol: string
  kind: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out'
  shares: number
  price_cents: number
  total_cents: number
  occurred_at: string
  notes?: string | null
}

export interface ApiHolding {
  id?: string
  symbol: string
  name?: string | null
  asset_class?: string | null
  shares: number
  market_value_cents: number
  cost_basis_cents: number
}

export interface ApiWatchlistItem {
  id: string
  symbol: string
  name: string
}

/** Seed a transaction directly via the API — faster than driving the
 *  modal for tests that just need a row to act on. */
export async function seedTransaction(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    symbol: string
    kind: 'buy' | 'sell' | 'dividend'
    shares: number
    price_cents: number
    occurred_at: string
  }> = {},
): Promise<ApiTransaction> {
  const body = {
    symbol: overrides.symbol ?? 'AAPL',
    kind: overrides.kind ?? 'buy',
    shares: overrides.shares ?? 10,
    price_cents: overrides.price_cents ?? 17500,
    occurred_at: overrides.occurred_at ?? '2026-04-01',
  }
  const res = await page.request.post(`${API_BASE}/transactions`, {
    headers: authHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as ApiTransaction
}

export async function listTransactions(
  page: Page,
  accessToken: string | null,
): Promise<ApiTransaction[]> {
  const res = await page.request.get(`${API_BASE}/transactions`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBeLessThan(400)
  const body = (await res.json()) as ApiTransaction[] | { data: ApiTransaction[] }
  return Array.isArray(body) ? body : body.data
}

export async function listHoldings(page: Page, accessToken: string | null): Promise<ApiHolding[]> {
  const res = await page.request.get(`${API_BASE}/holdings`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBeLessThan(400)
  const body = (await res.json()) as ApiHolding[] | { data: ApiHolding[] }
  return Array.isArray(body) ? body : body.data
}

export async function listWatchlist(
  page: Page,
  accessToken: string | null,
): Promise<ApiWatchlistItem[]> {
  const res = await page.request.get(`${API_BASE}/watchlist`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBeLessThan(400)
  const body = (await res.json()) as ApiWatchlistItem[] | { data: ApiWatchlistItem[] }
  return Array.isArray(body) ? body : body.data
}

/** Read /reports/summary so a spec can confirm the dashboard's data
 *  matches what the user just did (read-after-write invariant). */
export async function reportSummary(
  page: Page,
  accessToken: string | null,
): Promise<{
  total_value_cents: number
  cost_basis_cents: number
  holding_count: number
}> {
  const res = await page.request.get(`${API_BASE}/reports/summary`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBeLessThan(400)
  return (await res.json()) as {
    total_value_cents: number
    cost_basis_cents: number
    holding_count: number
  }
}

/** Fail the spec if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s and dev-only React warnings). */
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
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource|sw\.js/i.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}
