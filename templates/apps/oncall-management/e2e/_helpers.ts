// E2E helpers for the oncall-management (Klaxon) flagship.
// Each spec uses these to sign up an isolated user, drive the SPA's
// auth bond directly so subsequent navigations are authenticated, and
// exercise the real backend (no mocks). Every signup also bootstraps
// the demo seed (responders, schedules, escalation policies, incidents,
// postmortems, notifications) via the api/src/handlers/_seed.ts
// seedDemoForUser() called from the per-handler list endpoints.

import { Page, expect, APIResponse } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'klaxon') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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

const tokenByPage = new WeakMap<Page, string>()

export function authHeaders(page: Page): Record<string, string> {
  const tok = tokenByPage.get(page)
  return tok
    ? { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export async function safeText(res: APIResponse): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Sign up a fresh user via the /api/users endpoint, then persist the
 * accessToken + user payload into the page context so subsequent SPA
 * navigations are authenticated. Returns the JWT for direct API calls.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Klaxon Tester' },
  })
  expect(res.status(), `signup should return 201, got body: ${await safeText(res)}`).toBe(201)
  const body = (await res.json()) as {
    accessToken: string
    props?: Record<string, unknown>
    user?: Record<string, unknown>
  }
  if (!body.accessToken) {
    throw new Error('signup did not return accessToken: ' + JSON.stringify(body))
  }
  const userPayload = (body.user ?? body.props ?? {}) as Record<string, unknown>
  const userId = (userPayload.id as string | undefined) ?? ''
  tokenByPage.set(page, body.accessToken)
  return {
    email,
    password,
    accessToken: body.accessToken,
    userId,
  }
}

/** Drive the Signup form with the actual UI inputs (slower, used to assert
 *  the UI form works end-to-end, not just the API).
 *
 *  Hardening (mirrors virtual-classroom b296e327d): gate submit on
 *  enabled, arm POST listener BEFORE click, assert response < 400, wait
 *  for nav off /signup, then poll until accessToken is readable. */
export async function signupViaUI(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Klaxon's signup form has 4 fields: name, email, password, confirmPassword.
  const nameField = page.locator('#name').first()
  if (await nameField.count()) await nameField.fill('Klaxon UI Tester')
  await page.locator('#email, input[type="email"]').first().fill(email)
  await page.locator('#password').first().fill(password)
  const confirm = page.locator('#confirmPassword').first()
  if (await confirm.count()) await confirm.fill(password)
  const submit = page
    .getByRole('button', { name: /create\s*account|sign\s*up|join|start\s*free/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#login-email, input[type="email"]').first().fill(email)
  await page.locator('#login-password, input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
}

/** Capture every network response during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
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

/** Fail the test if any non-favicon, non-network console.error appears. */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
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

// --- Incident / Schedule / Policy / Postmortem / Team helpers (real backend writes) ---

export interface IncidentRow {
  id: string
  title: string
  status: 'triggered' | 'acknowledged' | 'resolved'
  severity: 'critical' | 'warning' | 'info'
  service: string
  assignee: string | null
}

export async function listIncidents(page: Page): Promise<IncidentRow[]> {
  const res = await page.request.get(`${API_BASE}/incidents`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /incidents should be 200, got: ${await safeText(res)}`).toBe(200)
  const body = await res.json()
  return Array.isArray(body) ? body : (body.items ?? body.incidents ?? [])
}

export async function readIncident(
  page: Page,
  id: string,
): Promise<IncidentRow & { events: Array<{ kind: string }>; postmortem_id: string | null }> {
  const res = await page.request.get(`${API_BASE}/incidents/${id}`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /incidents/:id should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function triggerIncident(
  page: Page,
  args: { title: string; service: string; severity?: 'critical' | 'warning' | 'info' },
): Promise<IncidentRow> {
  const res = await page.request.post(`${API_BASE}/incidents`, {
    headers: authHeaders(page),
    data: {
      title: args.title,
      service: args.service,
      severity: args.severity ?? 'warning',
    },
  })
  expect(res.status(), `POST /incidents should be 2xx, got: ${await safeText(res)}`).toBeLessThan(
    300,
  )
  return res.json()
}

export async function ackIncident(page: Page, id: string): Promise<void> {
  const res = await page.request.put(`${API_BASE}/incidents/${id}/ack`, {
    headers: authHeaders(page),
    data: {},
  })
  expect(res.status(), `PUT ack should be 2xx, got: ${await safeText(res)}`).toBeLessThan(300)
}

export async function resolveIncident(page: Page, id: string): Promise<void> {
  const res = await page.request.put(`${API_BASE}/incidents/${id}/resolve`, {
    headers: authHeaders(page),
    data: {},
  })
  expect(res.status(), `PUT resolve should be 2xx, got: ${await safeText(res)}`).toBeLessThan(300)
}

export async function escalateIncident(page: Page, id: string): Promise<number> {
  const res = await page.request.put(`${API_BASE}/incidents/${id}/escalate`, {
    headers: authHeaders(page),
    data: {},
  })
  expect(res.status(), `PUT escalate should be 2xx, got: ${await safeText(res)}`).toBeLessThan(300)
  const body = (await res.json()) as { escalation_level?: number }
  return Number(body.escalation_level ?? 0)
}

export async function listSchedules(
  page: Page,
): Promise<Array<{ id: string; name: string; current_oncall: { name: string } | null }>> {
  const res = await page.request.get(`${API_BASE}/schedules`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /schedules should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function listPolicies(
  page: Page,
): Promise<Array<{ id: string; name: string; rules: unknown[] }>> {
  const res = await page.request.get(`${API_BASE}/escalation-policies`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /escalation-policies should be 200, got: ${await safeText(res)}`).toBe(
    200,
  )
  return res.json()
}

export async function listPostmortems(
  page: Page,
): Promise<Array<{ id: string; title: string; open_action_items: number }>> {
  const res = await page.request.get(`${API_BASE}/postmortems`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /postmortems should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function listNotifications(
  page: Page,
): Promise<Array<{ id: string; kind: string; read: boolean }>> {
  const res = await page.request.get(`${API_BASE}/notifications`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /notifications should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function getOverview(page: Page): Promise<{
  oncall_now: Array<{ schedule_name: string; oncall: { name: string } | null }>
  counts: { open: number; triggered: number }
}> {
  const res = await page.request.get(`${API_BASE}/overview`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /overview should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function listTeam(page: Page): Promise<{ members: unknown[]; invites: unknown[] }> {
  const res = await page.request.get(`${API_BASE}/team`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /team should be 200, got: ${await safeText(res)}`).toBe(200)
  const body = await res.json()
  if (Array.isArray(body)) return { members: body, invites: [] }
  return { members: body.members ?? [], invites: body.invites ?? [] }
}

export async function inviteTeamMember(
  page: Page,
  args: { email: string; role?: 'admin' | 'responder' | 'viewer' },
): Promise<{ id: string; email: string; role: string; status: string }> {
  const res = await page.request.post(`${API_BASE}/team/invite`, {
    headers: authHeaders(page),
    data: { email: args.email, role: args.role ?? 'responder' },
  })
  expect(res.status(), `POST /team/invite should be 2xx, got: ${await safeText(res)}`).toBeLessThan(
    300,
  )
  return res.json()
}

export async function listApiKeys(
  page: Page,
): Promise<Array<{ id: string; name: string; prefix: string }>> {
  const res = await page.request.get(`${API_BASE}/profile/api-keys`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /api-keys should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}
