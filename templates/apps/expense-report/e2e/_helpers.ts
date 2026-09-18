// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3120')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4120') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'recoup') {
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

export interface SeededExpense {
  id: string
  merchant: string
  amount: number
  amountCents: number
  category: string
  status: string
}

export interface SeededReport {
  id: string
  title: string
  status: string
  total_amount: number
  total_amount_cents: number
}

/** Create a draft expense for the authenticated user. */
export async function seedExpense(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    merchant: string
    amount: number
    category: string
    date: string
    description: string
    receipt_url: string | null
  }> = {},
): Promise<SeededExpense> {
  const merchant = overrides.merchant ?? `Test Merchant ${Date.now()}-${++counter}`
  const date = overrides.date ?? new Date().toISOString().slice(0, 10)
  const res = await page.request.post(`${API_BASE}/expenses`, {
    headers: apiHeaders(accessToken),
    data: {
      merchant,
      amount: overrides.amount ?? 42.5,
      category: overrides.category ?? 'meals',
      date,
      description: overrides.description ?? 'Seeded by e2e helper',
      receipt_url: overrides.receipt_url ?? null,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as {
    id: string
    merchant: string
    amount?: number
    amountCents?: number
    category?: string
    status?: string
  }
  return {
    id: body.id,
    merchant: body.merchant ?? merchant,
    amount: body.amount ?? overrides.amount ?? 0,
    amountCents: body.amountCents ?? Math.round((body.amount ?? overrides.amount ?? 0) * 100),
    category: body.category ?? overrides.category ?? 'meals',
    status: body.status ?? 'draft',
  }
}

/** Create a report and (optionally) link selected expense ids to it. */
export async function seedReport(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    description: string
    purpose: string
    approver_email: string
    expense_ids: string[]
  }> = {},
): Promise<SeededReport> {
  const title = overrides.title ?? `Test Report ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/reports`, {
    headers: apiHeaders(accessToken),
    data: {
      title,
      description: overrides.description ?? 'Seeded by e2e helper',
      purpose: overrides.purpose,
      approver_email: overrides.approver_email,
      expense_ids: overrides.expense_ids ?? [],
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as {
    id: string
    title: string
    status?: string
    total_amount?: number
    total_amount_cents?: number
  }
  return {
    id: body.id,
    title: body.title ?? title,
    status: body.status ?? 'draft',
    total_amount: body.total_amount ?? 0,
    total_amount_cents: body.total_amount_cents ?? 0,
  }
}

/** Submit a report for approval. */
export async function submitReport(
  page: Page,
  accessToken: string,
  reportId: string,
  approverEmail?: string,
): Promise<void> {
  const res = await page.request.post(`${API_BASE}/reports/${reportId}/submit`, {
    headers: apiHeaders(accessToken),
    data: approverEmail ? { approver_email: approverEmail } : {},
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
}

/** A pending-approval row in the shape `GET /api/approvals/pending` returns. */
export interface PendingApproval {
  id: string
  title: string
  submitter_name: string
  total_amount_cents: number
}

/**
 * The reports waiting on the signed-in user's review.
 *
 * Specs read the queue item they drive out of the API instead of naming
 * one: the demo queue is the first thing an app's owner replaces, and a
 * spec that names a provisioned row fails on a correct app.
 */
export async function getPendingApprovals(
  page: Page,
  accessToken: string,
): Promise<PendingApproval[]> {
  const res = await page.request.get(`${API_BASE}/approvals/pending`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as PendingApproval[]
}
