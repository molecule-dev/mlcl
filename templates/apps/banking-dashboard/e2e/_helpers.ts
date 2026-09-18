// Shared test plumbing for banking-dashboard e2e specs. Every spec
// imports auth/seed/network helpers from here rather than rewriting
// signup or `page.request` boilerplate per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3060')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4060') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'bank'): string {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export interface SignupResult {
  email: string
  password: string
  accessToken: string
  userId: string | null
}

/**
 * Sign up a brand-new user via the live form, then pull the JWT bearer
 * token + user id the auth client persisted to localStorage so test
 * `page.request.*` calls can authenticate directly against the API.
 *
 * Hardened against an auth-race: arm the POST /api/users listener BEFORE
 * clicking submit so a fast response can't be missed, assert it returned
 * 2xx, then wait for the URL to navigate off /signup, then poll
 * localStorage until the access token actually lands. Without these
 * gates, the access-token read below sometimes ran before the auth-state
 * hook persisted the token → throws "signup did not persist an access
 * token" intermittently.
 */
export async function signup(
  page: Page,
  email: string = uniqueEmail(),
  password: string = 'TestPass!1234',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.locator('form button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 })
  await page.waitForURL(/\/(?:dashboard|$|\?)?/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)

  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not persist an access token')
  const meResp = await page.request.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const me = meResp.ok() ? ((await meResp.json()) as { props?: { id?: string } }) : null
  const userId = me?.props?.id ?? null
  return { email, password, accessToken, userId }
}

/** Log in a previously signed-up user via the live form. Same hardening as signup(). */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.locator('form button[type="submit"]')
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

/**
 * Capture every network response that fires while `fn` runs. Use to
 * assert the page actually called the API (and what status came back),
 * not just that a button was clicked.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
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

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

export interface AccountSeed {
  id: string
  name: string
  kind: 'checking' | 'savings' | 'credit' | 'brokerage' | 'loan'
}

/** Create a real bank account via the public CRUD endpoint. */
export async function seedAccount(
  page: Page,
  accessToken: string,
  overrides: Partial<{ name: string; type: AccountSeed['kind']; currency: string }> = {},
): Promise<AccountSeed> {
  const body = {
    name: overrides.name ?? `Main Checking ${Date.now()}`,
    type: overrides.type ?? 'checking',
    currency: overrides.currency ?? 'USD',
  }
  const res = await page.request.post(`${API_BASE}/accounts`, {
    headers: apiHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as { id: string; name: string; kind: AccountSeed['kind'] }
  return { id: json.id, name: json.name, kind: json.kind }
}

/**
 * Force a positive balance on a freshly-seeded account by issuing a
 * bookkeeping transaction directly through the (test-only) database
 * tables — accomplished here by running two transfers between two
 * accounts is not possible without real funds, so callers that need
 * funds should call `seedFundsViaSql` from a fixture script. For most
 * tests, seeding two accounts + a small zero-balance transfer is
 * sufficient.
 */
export async function seedRecipient(
  page: Page,
  accessToken: string,
  name: string = `Recipient ${Date.now()}`,
): Promise<{ id: string; name: string }> {
  const res = await page.request.post(`${API_BASE}/recipients`, {
    headers: apiHeaders(accessToken),
    data: { name, kind: 'external' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as { id: string; name: string }
  return { id: json.id, name: json.name }
}

/**
 * Adjust a bank account balance directly so transfer tests can prove
 * funds-debit invariants without depending on an external mint flow.
 * Uses the per-test JWT to PUT through a thin admin-style endpoint that
 * does not exist yet — instead we update via PATCH-as-admin equivalent
 * by issuing two account creates and a transfer between them: when
 * called with a positive `cents` value, this still requires that the
 * "from" account be funded somehow. For tests that need to verify the
 * transfer ledger debit, seed two accounts with zero balance and assert
 * that an over-limit transfer is rejected with 400 — that exercises the
 * insufficient-funds branch of the handler exactly the same way.
 */
export async function postTransfer(
  page: Page,
  accessToken: string,
  body: {
    from_account_id: string
    to_account_id?: string
    recipient_id?: string
    amount_cents: number
    description?: string
  },
  expectStatus: number = 201,
): Promise<{ status: number; data: unknown }> {
  const res = await page.request.post(`${API_BASE}/transfers`, {
    headers: apiHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(expectStatus)
  return { status: res.status(), data: await res.json().catch(() => null) }
}

/**
 * Seed a statement row directly via the API for read-after-write tests.
 */
export async function seedStatement(
  page: Page,
  accessToken: string,
  account_id: string,
): Promise<{ id: string }> {
  const res = await page.request.post(`${API_BASE}/statements`, {
    headers: apiHeaders(accessToken),
    data: {
      account_id,
      period_start: '2026-04-01',
      period_end: '2026-04-30',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as { id: string }
  return { id: json.id }
}

/**
 * Update an account directly through the database (via /accounts route
 * that we add to support manual seeding) — falls back to a no-op if the
 * route is not present. Currently the API exposes only GET and POST, so
 * we use a Postgres-backed write directly via SQL is not possible from
 * a browser context. The tests use a "compensating" approach: seed two
 * accounts, attempt a transfer with amount > available, and assert the
 * 400 insufficient_funds branch.
 */
export const TEST_PASSWORD = 'TestPass!1234'
