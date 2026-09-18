// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3010')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4010') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'ledger') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user and land on /dashboard. Returns the credentials
 *  AND the JWT bearer token from the httpOnly cookie set by the auth client
 *  so callers can authenticate page.request.* calls (which use a separate
 *  cookie jar than the live browser). */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#signup-first-name').fill('Test')
  await page.locator('input#signup-last-name').fill('User')
  await page.locator('input#signup-company').fill('Test Co')
  await page.locator('input#signup-email').fill(email)
  await page.locator('input#signup-password').fill(password)
  await page.locator('input#signup-confirm').fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const meResp = await page.request.get(API_BASE + '/users/me')
  let userId: string | null = null
  if (meResp.ok()) {
    const me = (await meResp.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#login-email').fill(email)
  await page.locator('input#login-password').fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers (called via page.request with a JWT) ----------

export async function seedCustomer(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    company: string
    contact_name: string
    contact_email: string
    payment_terms: string
    tags: string[]
  }> = {},
) {
  const company = overrides.company ?? `Acme Co ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/customers`, {
    headers: apiHeaders(accessToken),
    data: {
      company,
      contact_name: overrides.contact_name ?? 'Jane Buyer',
      contact_email: overrides.contact_email ?? `jane+${Date.now()}@buyer.test`,
      payment_terms: overrides.payment_terms ?? 'net_30',
      tags: overrides.tags ?? [],
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; company: string }
  return { id: body.id, company: body.company }
}

export async function seedInvoice(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    customer_id: string
    customer_name: string
    status: string
    issue_date: string
    due_date: string
    line_items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>
    subtotal_cents: number
    tax_rate_pct: number
    tax_cents: number
    total_cents: number
    amount_cents: number
    invoice_number: string
  }> = {},
) {
  const lineAmount = 100
  const items = overrides.line_items ?? [
    { description: 'Service', quantity: 1, unit_price: lineAmount, amount: lineAmount },
  ]
  const subtotal =
    overrides.subtotal_cents ?? items.reduce((s, l) => s + Math.round((l.amount ?? 0) * 100), 0)
  const total = overrides.total_cents ?? subtotal
  const res = await page.request.post(`${API_BASE}/invoices`, {
    headers: apiHeaders(accessToken),
    data: {
      customer_id: overrides.customer_id,
      customer_name: overrides.customer_name ?? 'Acme Co',
      status: overrides.status ?? 'sent',
      issue_date: overrides.issue_date ?? new Date().toISOString(),
      due_date: overrides.due_date ?? new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      line_items: items,
      subtotal_cents: subtotal,
      tax_rate_pct: 0,
      tax_cents: 0,
      total_cents: total,
      amount_cents: total,
      invoice_number: overrides.invoice_number,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; number: string | null; status: string }
  return { id: body.id, number: body.number, status: body.status }
}

export async function seedExpense(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    amount: number
    merchant: string
    category: string
    occurred_at: string
    notes: string
    is_deductible: boolean
  }> = {},
) {
  const amount = overrides.amount ?? 49.99
  const res = await page.request.post(`${API_BASE}/expenses`, {
    headers: apiHeaders(accessToken),
    data: {
      amount,
      amount_cents: Math.round(amount * 100),
      merchant: overrides.merchant ?? `Vendor ${Date.now()}`,
      category: overrides.category ?? 'office',
      occurred_at: overrides.occurred_at ?? new Date().toISOString(),
      notes: overrides.notes ?? null,
      is_deductible: overrides.is_deductible ?? true,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, amount }
}

export async function seedPayment(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    invoice_id: string
    invoice_number: string
    customer_name: string
    amount_cents: number
    method: string
    reference: string
  }> = {},
) {
  const amount = overrides.amount_cents ?? 5000
  const res = await page.request.post(`${API_BASE}/payments`, {
    headers: apiHeaders(accessToken),
    data: {
      invoice_id: overrides.invoice_id,
      invoice_number: overrides.invoice_number,
      customer_name: overrides.customer_name ?? 'Acme Co',
      amount_cents: amount,
      method: overrides.method ?? 'manual',
      reference: overrides.reference,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, amount_cents: amount }
}

export async function seedAccount(
  page: Page,
  accessToken: string,
  overrides: Partial<{ code: string; name: string; type: string }> = {},
) {
  const code = overrides.code ?? `${1000 + Math.floor(Math.random() * 9000)}`
  const res = await page.request.post(`${API_BASE}/accounts`, {
    headers: apiHeaders(accessToken),
    data: {
      code,
      name: overrides.name ?? `Account ${code}`,
      type: overrides.type ?? 'asset',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, code }
}
