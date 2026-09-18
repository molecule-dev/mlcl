import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'tt') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

export interface AuthSession {
  email: string
  password: string
  accessToken: string
  userId: string | null
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

/**
 * Sign up a fresh user via the UI signup form. Returns the access token
 * from the httpOnly cookie so tests can also call the API directly.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
): Promise<AuthSession> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-test=signup-first-name]').fill('Test')
  await page.locator('[data-test=signup-last-name]').fill('User')
  await page.locator('[data-test=signup-email]').fill(email)
  await page.locator('[data-test=signup-password]').fill(password)
  await page.locator('[data-test=signup-confirm]').fill(password)
  const submit = page.locator('[data-test=signup-submit]')
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
  // Wait for the layout to mount so the auth client has finished hydrating.
  await page.locator('[data-test=sign-out]').waitFor({ timeout: 10000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not persist an access token')
  const meResp = await page.request.get(API_BASE + '/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    failOnStatusCode: false,
  })
  let userId: string | null = null
  if (meResp.ok()) {
    const me = (await meResp.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  return { email, password, accessToken, userId }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('[data-test=login-email]').fill(email)
  await page.locator('[data-test=login-password]').fill(password)
  const submit = page.locator('[data-test=login-submit]')
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
}

/** Sign out via the sidebar user menu. */
export async function logout(page: Page) {
  const out = page.locator('[data-test=sign-out]').first()
  if (await out.count().catch(() => 0)) {
    await out.click({ force: true })
    await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => undefined)
  }
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

/** Fail the test if any console.error fires during fn (allowing benign noise). */
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

// ---------- domain seed helpers (call API directly with the JWT) ----------

export interface SeededClient {
  id: string
  name: string
  email: string | null
  hourly_rate_cents: number | null
}

export interface SeededProject {
  id: string
  name: string
  client_id: string | null
  hourly_rate_cents: number | null
  budget_cents: number | null
  color: string
  billable: boolean
}

export interface SeededEntry {
  id: string
  project_id: string | null
  description: string
  duration_seconds: number | null
  is_billable: boolean
  invoiced: boolean
}

export interface SeededInvoice {
  id: string
  number: string
  client_id: string
  total_cents: number
  status: string
}

export async function seedClient(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    email: string
    hourly_rate_cents: number
    billing_currency: string
  }> = {},
): Promise<SeededClient> {
  const res = await page.request.post(`${API_BASE}/clients`, {
    headers: apiHeaders(accessToken),
    data: {
      name: overrides.name ?? `Client ${Date.now()}-${++counter}`,
      email: overrides.email ?? `client-${counter}@flagship.test`,
      hourly_rate_cents: overrides.hourly_rate_cents ?? 12000,
      billing_currency: overrides.billing_currency ?? 'USD',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as { data?: SeededClient } & SeededClient
  return body.data ?? body
}

export async function seedProject(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    client_id: string | null
    hourly_rate_cents: number
    budget_cents: number
    color: string
    billable: boolean
  }> = {},
): Promise<SeededProject> {
  const res = await page.request.post(`${API_BASE}/projects`, {
    headers: apiHeaders(accessToken),
    data: {
      name: overrides.name ?? `Project ${Date.now()}-${++counter}`,
      client_id: overrides.client_id ?? null,
      hourly_rate_cents: overrides.hourly_rate_cents ?? 15000,
      budget_cents: overrides.budget_cents ?? 500000,
      color: overrides.color ?? '#2563eb',
      billable: overrides.billable ?? true,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as { data?: SeededProject } & SeededProject
  return body.data ?? body
}

export async function seedEntry(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    description: string
    project_id: string | null
    started_at: string
    ended_at: string
    is_billable: boolean
  }> = {},
): Promise<SeededEntry> {
  const start = overrides.started_at ?? new Date(Date.now() - 90 * 60_000).toISOString()
  const end = overrides.ended_at ?? new Date(Date.now() - 30 * 60_000).toISOString()
  const res = await page.request.post(`${API_BASE}/entries`, {
    headers: apiHeaders(accessToken),
    data: {
      description: overrides.description ?? `Entry ${Date.now()}-${++counter}`,
      project_id: overrides.project_id ?? null,
      started_at: start,
      ended_at: end,
      is_billable: overrides.is_billable ?? true,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as { data?: SeededEntry } & SeededEntry
  return body.data ?? body
}

export async function seedInvoice(
  page: Page,
  accessToken: string,
  args: { client_id: string; source_entry_ids: string[]; due_at?: string; notes?: string },
): Promise<SeededInvoice> {
  const res = await page.request.post(`${API_BASE}/invoices`, {
    headers: apiHeaders(accessToken),
    data: {
      client_id: args.client_id,
      source_entry_ids: args.source_entry_ids,
      due_at: args.due_at ?? new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      notes: args.notes ?? null,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as { data?: SeededInvoice } & SeededInvoice
  return body.data ?? body
}
