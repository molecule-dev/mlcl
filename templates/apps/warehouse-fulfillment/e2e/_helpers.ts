// Shared Playwright helpers for warehouse-fulfillment e2e specs. Every spec
// imports from this module rather than re-implementing auth / network /
// seeding plumbing. Read-after-write helpers (signup, seedSampleData, etc.)
// return live API rows so tests can assert on persisted state, not just
// "the click happened".

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3150')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4150') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'sorthaus') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export interface SignedUpUser {
  email: string
  password: string
  accessToken: string
  userId: string | null
}

/**
 * Sign up a fresh user via the UI. Returns email, password, and the
 * persisted JWT bearer token + user id. Tests use the access token to
 * make authenticated API requests directly via page.request.* (which
 * uses its own cookie jar, separate from the live browser session).
 *
 * Deterministic gating: arm POST /api/users BEFORE the click (so a fast
 * response can't be missed), assert < 400, wait for nav to /dashboard,
 * then poll until the JWT lands in localStorage. Without this, specs
 * that immediately use the returned accessToken sometimes get a null
 * value because React routes the moment POST resolves but the auth
 * hook persists the JWT in a subsequent microtask → throw on missing
 * token → "flaky".
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
): Promise<SignedUpUser> {
  await page.goto(APP_BASE + '/signup')
  // Name (text), email, password — only fields on the signup form.
  await page.locator('input[autocomplete="name"]').first().fill('E2E Tester')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userResp = await page.request.get(`${API_BASE}/users/me`, { failOnStatusCode: false })
  let userId: string | null = null
  if (userResp.ok()) {
    const body = (await userResp.json()) as { props?: { id?: string }; id?: string }
    userId = body?.props?.id ?? body?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

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

/**
 * Fail the test if any console.error fires during fn (allowing benign
 * third-party noise).
 */
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

// ---------- domain-specific helpers ----------

export interface Order {
  id: string
  externalOrderId?: string
  status: string
  priority: string
  customerName: string
  total?: number
  items?: Array<{ id: string; name: string; quantity: number; price: number }>
}

/**
 * Seed the demo dataset (orders, inventory, zones, shipments, receipts,
 * returns, notifications) for the authenticated user. Returns nothing —
 * tests should re-fetch the resources they care about with the
 * read-after-write helpers below.
 */
export async function seedSampleData(page: Page, accessToken: string): Promise<void> {
  const res = await page.request.post(`${API_BASE}/setup/seed`, {
    headers: apiHeaders(accessToken),
    data: {},
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
}

export async function listOrders(page: Page, accessToken: string): Promise<Order[]> {
  const res = await page.request.get(`${API_BASE}/orders`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as Order[]
}

export async function getOrder(
  page: Page,
  accessToken: string,
  id: string,
): Promise<Order & { events?: Array<{ id: string; status: string }> }> {
  const res = await page.request.get(`${API_BASE}/orders/${id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok(), `GET /orders/${id}`).toBe(true)
  return (await res.json()) as Order & { events?: Array<{ id: string; status: string }> }
}

export interface InventoryItem {
  id: string
  name: string
  sku: string
  bin?: string
  onHand: number
  reorderPoint?: number
  price?: number
}

export async function listInventory(page: Page, accessToken: string): Promise<InventoryItem[]> {
  const res = await page.request.get(`${API_BASE}/inventory`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as InventoryItem[]
}

export async function getInventoryItem(
  page: Page,
  accessToken: string,
  id: string,
): Promise<InventoryItem & { movements?: Array<{ id: string; type: string; quantity: number }> }> {
  const res = await page.request.get(`${API_BASE}/inventory/${id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as InventoryItem & {
    movements?: Array<{ id: string; type: string; quantity: number }>
  }
}

export interface Zone {
  id: string
  name?: string
  kind?: string
  code?: string | null
  bins?: number | null
  utilization_pct?: number | null
}

export async function listZones(page: Page, accessToken: string): Promise<Zone[]> {
  const res = await page.request.get(`${API_BASE}/zones`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as Zone[]
}

export interface Shipment {
  id: string
  carrier?: string
  status?: string
  tracking_number?: string | null
}

export async function listShipments(page: Page, accessToken: string): Promise<Shipment[]> {
  const res = await page.request.get(`${API_BASE}/shipments`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as Shipment[]
}

export interface Receipt {
  id: string
  supplier?: string | null
  po_number?: string | null
  expected_units?: number | null
  status?: string
}

export async function listReceipts(page: Page, accessToken: string): Promise<Receipt[]> {
  const res = await page.request.get(`${API_BASE}/receipts`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as Receipt[]
}

export interface ReturnRow {
  id: string
  rma_number?: string | null
  reason?: string | null
  status?: string
}

export async function listReturns(page: Page, accessToken: string): Promise<ReturnRow[]> {
  const res = await page.request.get(`${API_BASE}/returns`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as ReturnRow[]
}

export interface NotificationRow {
  id: string
  kind?: string
  body?: string
  read_at?: string | null
}

export async function listNotifications(
  page: Page,
  accessToken: string,
): Promise<NotificationRow[]> {
  const res = await page.request.get(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.ok()).toBe(true)
  return (await res.json()) as NotificationRow[]
}
