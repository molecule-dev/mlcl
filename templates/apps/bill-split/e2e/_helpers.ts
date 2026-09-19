// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3130')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4130') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'evenly') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
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

/** Sign up a fresh user via the UI signup form. Returns email, password,
 *  the JWT bearer access token persisted to localStorage, and the user id.
 *  Tests use the access token to make authenticated API requests directly
 *  via page.request.* (which has its own cookie jar, separate from the
 *  live browser session). */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').first().fill(email)
  const passwordInputs = page.locator('input[autocomplete="new-password"]')
  await passwordInputs.nth(0).fill(password)
  if (
    await passwordInputs
      .nth(1)
      .count()
      .catch(() => 0)
  ) {
    await passwordInputs.nth(1).fill(password)
  }
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // Auth-state hook persists JWT in a microtask after React routes;
  // without this, subsequent page.request.* calls 401-flake. See
  // virtual-classroom/_helpers.ts for the full rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  // Wait for the post-signup landing route (dashboard for protected apps).
  await page
    .waitForURL(/\/(dashboard|home|onboarding|reports|expenses)/, { timeout: 15000 })
    .catch(() => {})
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  let userId: string | null = null
  const meRes = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  if (meRes.ok()) {
    const meBody = (await meRes.json()) as { props?: { id?: string }; id?: string }
    userId = meBody?.props?.id ?? meBody?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. Same auth-race hardening as signup(). */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
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

/** Sign out via the user menu. */
export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers (called via page.request with a JWT) ----------

export interface ApiGroup {
  id: string
  name: string
  description: string | null
  currency: string
  member_count?: number
  members?: { id: string; name: string; is_self: boolean }[]
  my_balance_cents?: number
  total_expenses_cents?: number
}

export interface ApiBalance {
  member_id: string
  name: string
  is_self: boolean
  paid_cents: number
  owed_cents: number
  sent_cents: number
  received_cents: number
  net_cents: number
}

export interface ApiTransfer {
  from_member_id: string
  to_member_id: string
  amount_cents: number
}

export interface ApiGroupDetail extends ApiGroup {
  members: { id: string; name: string; email: string | null; is_self: boolean }[]
  balances: ApiBalance[]
  suggestions: ApiTransfer[]
}

export interface ApiExpense {
  id: string
  group_id: string
  payer_member_id: string
  payer_name: string
  amount_cents: number
  description: string
  category: string
  date: string | null
  split_method: string
  shares: { member_id: string; amount_cents: number }[]
}

export interface ApiSettlement {
  id: string
  group_id: string
  from_member_id: string
  from_name: string
  to_member_id: string
  to_name: string
  amount_cents: number
  method: string
  date: string | null
  note: string | null
}

/**
 * Create a group for the authenticated user (self is added as owner).
 *
 * Specs create the rows they assert on instead of naming demo data: the
 * seeded world is the first thing an app's owner replaces, and a spec that
 * names a provisioned row fails on a correct app.
 */
export async function createGroupViaApi(
  page: Page,
  accessToken: string,
  overrides: Partial<{ name: string; description: string; member_names: string[] }> = {},
): Promise<ApiGroupDetail> {
  const name = overrides.name ?? `E2E Group ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/groups`, {
    headers: apiHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'Created by the e2e suite',
      member_names: overrides.member_names ?? ['E2E Friend One', 'E2E Friend Two'],
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const created = (await res.json()) as { id: string }
  return getGroupDetail(page, accessToken, created.id)
}

/** The full group payload (members, balances, simplify suggestions). */
export async function getGroupDetail(
  page: Page,
  accessToken: string,
  groupId: string,
): Promise<ApiGroupDetail> {
  const res = await page.request.get(`${API_BASE}/groups/${groupId}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ApiGroupDetail
}

/** Groups owned by the signed-in user. */
export async function getGroups(page: Page, accessToken: string): Promise<ApiGroup[]> {
  const res = await page.request.get(`${API_BASE}/groups`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ApiGroup[]
}

/** Add an expense split across a group. Money is integer cents on the wire. */
export async function seedExpense(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    group_id: string
    payer_member_id: string
    amount_cents: number
    description: string
    category: string
    date: string
    split_method: 'equal' | 'exact' | 'shares'
    participants: string[]
    shares: { member_id: string; amount_cents?: number; weight?: number }[]
  }> = {},
): Promise<ApiExpense> {
  const res = await page.request.post(`${API_BASE}/expenses`, {
    headers: apiHeaders(accessToken),
    data: {
      group_id: overrides.group_id,
      payer_member_id: overrides.payer_member_id,
      amount_cents: overrides.amount_cents ?? 9000,
      description: overrides.description ?? `E2E Expense ${Date.now()}-${++counter}`,
      category: overrides.category ?? 'other',
      date: overrides.date ?? new Date().toISOString().slice(0, 10),
      split_method: overrides.split_method ?? 'equal',
      participants: overrides.participants,
      shares: overrides.shares,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as ApiExpense
}

/** Record a settlement (money that already moved between two members). */
export async function recordSettlement(
  page: Page,
  accessToken: string,
  input: {
    group_id: string
    from_member_id: string
    to_member_id: string
    amount_cents: number
    method?: 'cash' | 'transfer' | 'app' | 'other'
  },
): Promise<ApiSettlement> {
  const res = await page.request.post(`${API_BASE}/settlements`, {
    headers: apiHeaders(accessToken),
    data: { ...input, method: input.method ?? 'cash' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as ApiSettlement
}

/** Settlements recorded in a group, newest first. */
export async function getSettlements(
  page: Page,
  accessToken: string,
  groupId: string,
): Promise<ApiSettlement[]> {
  const res = await page.request.get(`${API_BASE}/settlements?group_id=${groupId}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ApiSettlement[]
}

/** A feed row in the shape `GET /api/activities` returns. */
export interface ApiActivity {
  id: string
  group_id: string
  group_name: string
  kind: string
  payload: Record<string, unknown>
  created_at: string | null
}

/** The cross-group activity feed rows. */
export async function getActivities(page: Page, accessToken: string): Promise<ApiActivity[]> {
  const res = await page.request.get(`${API_BASE}/activities?limit=100`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ApiActivity[]
}
