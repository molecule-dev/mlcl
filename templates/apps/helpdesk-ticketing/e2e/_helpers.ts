// Shared helpers for the helpdesk-ticketing flagship e2e specs.
//
// Specs assert on real outcomes — DB rows visible after reload, status
// transitions persisted, billing checkout returning a real Stripe URL,
// entitlements surfacing through /api/billing/status. Auth + seed flows
// live here so a single broken signup doesn't snowball through the suite.

import {
  Page,
  expect,
  Request as PWRequest,
  Response as PWResponse,
} from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3290')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4290') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'hd'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface AuthedSession {
  email: string
  password: string
  accessToken: string
  userId: string
}

/**
 * Sign up via the UI. The helpdesk signup form has Email + Password only —
 * /signup posts to /api/users with no name field. Returns credentials +
 * the JWT bearer token persisted to localStorage.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<AuthedSession> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
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

  const accessToken = (await getAccessToken(page)) ?? ''
  const userRes = await page.request.get(`${API_BASE}/users/me`)
  let userId = ''
  if (userRes.ok()) {
    const me = (await userRes.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? ''
  }
  expect(accessToken, 'signup must persist accessToken to cookie').not.toBe('')
  expect(userId, 'signup must return user.id from /users/me').not.toBe('')
  return { email, password, accessToken, userId }
}

/**
 * Become the helpdesk operator for the current (already-authed) session.
 *
 * The catalog writes (KB articles, macros, SLA policies) are gated behind
 * `requireAdmin`, and ticket-queue writes (status → resolved/closed/etc.,
 * delete) behind `isHelpdeskAdmin` — both read `users.role`, which defaults to
 * the non-operator 'user' on a fresh signup. This calls the dev-only
 * `POST /api/_test/promote-admin` endpoint (404 in production; served only when
 * `ENABLE_E2E_TEST_ENDPOINTS=true`, which the harness sets) to elevate the
 * caller's OWN row to `role = 'admin'`. So an operator e2e flow signs up a
 * fresh user and then becomes the operator — exercising the real operator
 * surfaces without weakening the gate for ordinary users.
 */
export async function promoteToAdmin(page: Page, accessToken?: string | null): Promise<void> {
  const token = accessToken ?? (await getAccessToken(page))
  const res = await page.request.post(`${API_BASE}/_test/promote-admin`, {
    headers: authHeaders(token),
    failOnStatusCode: false,
  })
  expect(res.status(), `POST /api/_test/promote-admin → ${res.status()}`).toBeLessThan(400)
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email, input[type="email"]').first().fill(email)
  await page.locator('#password, input[type="password"]').first().fill(password)
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
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear())
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: PWResponse) => {
    const req: PWRequest = resp.request()
    reqs.push({ method: req.method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export interface SeededTicket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string | null
  assignee_id: string | null
  requester_id: string
  created_at: string
  updated_at: string
}

export async function seedTicket(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    subject: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    category: string
  }> = {},
): Promise<SeededTicket> {
  const data = {
    subject: overrides.subject ?? `E2E ticket ${++counter}`,
    description:
      overrides.description ?? 'Generated by the helpdesk-ticketing e2e suite — safe to delete.',
    priority: overrides.priority ?? 'medium',
    category: overrides.category,
  }
  const res = await page.request.post(`${API_BASE}/tickets`, {
    headers: authHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as SeededTicket
}

export async function getTicket(
  page: Page,
  accessToken: string,
  id: string,
): Promise<SeededTicket & { replies?: Array<{ id: string; body: string }> }> {
  const res = await page.request.get(`${API_BASE}/tickets/${id}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as SeededTicket & {
    replies?: Array<{ id: string; body: string }>
  }
}
