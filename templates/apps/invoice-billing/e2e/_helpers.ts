/**
 * Test helpers for invoice-billing e2e suite.
 *
 * Every spec imports from this module so auth + network plumbing isn't
 * re-implemented per file. Tests assert on real outcomes (DB rows,
 * Stripe URLs, real emails, real PDFs) — never on "click happened".
 */

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3150')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4150') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'remit') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Sign up a fresh user via the UI. Returns the credentials AND the JWT
 * bearer token (read from the httpOnly `token` cookie) so callers can
 * authenticate `page.request.*` calls.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  // Inputs in this template have no `name=` and no `id=` — only
  // `aria-label`. Keyed by aria-label via getByLabel.
  await page.getByLabel('First name', { exact: true }).fill('Test')
  await page.getByLabel('Last name', { exact: true }).fill('User')
  await page.getByLabel('Work email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  // Hardening: gate on submit-enabled, arm the POST /api/users response
  // listener BEFORE the click, then poll until the JWT lands in
  // localStorage. Eliminates a race where the inline `accessToken` read
  // below ran before the molecule auth hook had persisted the token,
  // throwing "signup did not persist an access token" on attempt 1 but
  // passing under retries:2 (surfacing as 'flaky').
  const submit = page.getByRole('button', { name: /Create account/i })
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
  const meResp = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  const userId = meResp.ok()
    ? (((await meResp.json()) as { props?: { id?: string } }).props?.id ?? null)
    : null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password)
  const submit = page.getByRole('button', { name: /Sign in|Log in|Continue/i }).first()
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

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
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

/** Build the Authorization+Content-Type headers for `page.request.*` calls. */
export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers ----------
//
// Call after signup() to create real DB rows for the test user. They use
// page.request.* (which inherits cookies from the browser context plus
// the explicit Authorization header) so they hit the same backend the
// UI uses.

/** A client row in the shape `GET /api/clients` returns. */
export interface ClientRow {
  id: string
  name: string
  email?: string | null
}

/**
 * The clients the account actually holds.
 *
 * Specs read the client they drive out of the API instead of naming one:
 * the demo client book is the first thing an app's owner replaces, and a
 * spec that names a provisioned row fails on a correct app.
 */
export async function getClients(page: Page, accessToken: string): Promise<ClientRow[]> {
  const res = await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ClientRow[]
}

export async function seedClient(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    company: string
    email: string
    phone: string
    address: string
    notes: string
    tax_id: string
  }> = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? `Acme Co ${Date.now()}-${++counter}`
  const data: Record<string, unknown> = {
    name,
    company: overrides.company ?? 'Acme LLC',
    email: overrides.email ?? `billing+${Date.now()}@flagship.test`,
    phone: overrides.phone ?? '+1 (555) 010-0000',
  }
  if (overrides.address !== undefined) data.address = overrides.address
  if (overrides.notes !== undefined) data.notes = overrides.notes
  if (overrides.tax_id !== undefined) data.tax_id = overrides.tax_id
  const res = await page.request.post(`${API_BASE}/clients`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; name: string }
  return { id: body.id, name: body.name }
}

export async function seedInvoice(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    client_id: string
    items: Array<{ description: string; quantity: number; unit_price: number }>
    due_date: string
    notes: string
    tax_rate: number
    currency: string
  }> = {},
): Promise<{ id: string; invoice_number: string; total: number; status: string }> {
  let clientId = overrides.client_id
  if (!clientId) {
    const c = await seedClient(page, accessToken)
    clientId = c.id
  }
  const items = overrides.items ?? [{ description: 'Service', quantity: 1, unit_price: 100 }]
  const data: Record<string, unknown> = { client_id: clientId, items }
  if (overrides.due_date !== undefined) data.due_date = overrides.due_date
  if (overrides.notes !== undefined) data.notes = overrides.notes
  if (overrides.tax_rate !== undefined) data.tax_rate = overrides.tax_rate
  if (overrides.currency !== undefined) data.currency = overrides.currency
  const res = await page.request.post(`${API_BASE}/invoices`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as {
    id: string
    invoice_number: string
    total: number
    status: string
  }
  return body
}

export async function seedPayment(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    invoice_id: string
    amount: number
    method: string
    reference: string
  }> = {},
): Promise<{ id: string; amount: number }> {
  const amount = overrides.amount ?? 50
  const data: Record<string, unknown> = {
    invoice_id: overrides.invoice_id,
    amount,
    method: overrides.method ?? 'manual',
  }
  if (overrides.reference !== undefined) data.reference = overrides.reference
  const res = await page.request.post(`${API_BASE}/payments`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; amount: number }
  return body
}
