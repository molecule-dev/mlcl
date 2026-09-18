// E2E helpers for the ai-workflow-automator (Dendrite) flagship.
// Each spec uses these to sign up an isolated user, drive the SPA's auth bond
// directly so subsequent navigations are authenticated, and exercise the real
// backend (no mocks).

import { Page, expect, APIResponse } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'dendrite') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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
 * Sign up a fresh user via /api/users, then persist the accessToken + user
 * payload into localStorage so subsequent SPA navigations are authenticated.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Dendrite Tester' },
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
  // [M1-1] Token is now an httpOnly cookie set by the server; no
  // localStorage injection needed. tokenByPage is kept for authHeaders().
  tokenByPage.set(page, body.accessToken)
  return {
    email,
    password,
    accessToken: body.accessToken,
    userId,
  }
}

/** Drive the Signup form via the actual UI (slower but proves the form works).
 *
 *  Hardening: gates on (1) POST /api/users <400, (2) URL off /signup, and
 *  (3) accessToken landed in localStorage. See virtual-classroom's
 *  _helpers.ts for the rationale (auth-state hook persists JWT in a
 *  microtask AFTER React routes). */
export async function signupViaUI(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // signup form: name, email, password, confirm
  const inputs = page.locator('input')
  await inputs.nth(0).fill('Dendrite UI')
  await inputs.nth(1).fill(email)
  await inputs.nth(2).fill(password)
  await inputs.nth(3).fill(password)
  const submit = page
    .getByRole('button', { name: /start automating|create.*account|sign\s*up/i })
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
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  const inputs = page.locator('input')
  await inputs.locator('[type="email"]').first().fill(email)
  await inputs.locator('[type="password"]').first().fill(password)
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
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

// --- Workflow / template / run helpers (real backend writes) ---

export async function listWorkflows(page: Page): Promise<Array<Record<string, unknown>>> {
  const res = await page.request.get(`${API_BASE}/workflows`, { headers: authHeaders(page) })
  expect(res.status(), `GET /workflows should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function createWorkflow(
  page: Page,
  args: {
    name: string
    description?: string
    trigger_type?: 'manual' | 'webhook' | 'cron' | 'schedule'
    cron_expression?: string | null
    condition_prompt?: string
    steps?: Array<{ type: string; config?: Record<string, unknown> }>
  },
): Promise<Record<string, unknown>> {
  const res = await page.request.post(`${API_BASE}/workflows`, {
    headers: authHeaders(page),
    data: {
      name: args.name,
      description: args.description ?? '',
      trigger_type: args.trigger_type ?? 'manual',
      cron_expression: args.cron_expression ?? null,
      condition_prompt: args.condition_prompt ?? '',
      steps: args.steps ?? [],
    },
  })
  expect(res.status(), `POST /workflows: ${await safeText(res)}`).toBe(201)
  return res.json()
}

export async function readWorkflow(page: Page, id: string): Promise<Record<string, unknown>> {
  const res = await page.request.get(`${API_BASE}/workflows/${id}`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /workflows/:id: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function toggleWorkflow(page: Page, id: string): Promise<{ enabled: boolean }> {
  const res = await page.request.patch(`${API_BASE}/workflows/${id}/toggle`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `PATCH toggle: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function triggerWorkflow(page: Page, id: string): Promise<Record<string, unknown>> {
  const res = await page.request.post(`${API_BASE}/workflows/${id}/trigger`, {
    headers: authHeaders(page),
    data: {},
  })
  expect(res.status(), `POST trigger: ${await safeText(res)}`).toBe(202)
  return res.json()
}

export async function deleteWorkflow(page: Page, id: string): Promise<void> {
  const res = await page.request.delete(`${API_BASE}/workflows/${id}`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `DELETE: ${await safeText(res)}`).toBe(204)
}

export async function listRuns(page: Page): Promise<Array<Record<string, unknown>>> {
  const res = await page.request.get(`${API_BASE}/runs`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function readRun(page: Page, id: string): Promise<Record<string, unknown>> {
  const res = await page.request.get(`${API_BASE}/runs/${id}`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function listTemplates(
  page: Page,
): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
  const res = await page.request.get(`${API_BASE}/templates`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function readTemplate(page: Page, id: string): Promise<Record<string, unknown>> {
  const res = await page.request.get(`${API_BASE}/templates/${id}`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function installTemplate(
  page: Page,
  id: string,
): Promise<{ workflow_id: string; template_id: string }> {
  const res = await page.request.post(`${API_BASE}/templates/${id}/install`, {
    headers: authHeaders(page),
    data: {},
  })
  expect(res.status(), `POST install: ${await safeText(res)}`).toBe(201)
  return res.json()
}

export async function listConnections(page: Page): Promise<{ data: unknown[] }> {
  const res = await page.request.get(`${API_BASE}/connections`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function listNotifications(
  page: Page,
): Promise<{ data: unknown[]; total: number; unread: number }> {
  const res = await page.request.get(`${API_BASE}/notifications`, {
    headers: authHeaders(page),
  })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function getDashboard(page: Page): Promise<Record<string, unknown>> {
  const res = await page.request.get(`${API_BASE}/dashboard`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}

export async function getMe(page: Page): Promise<{ props: Record<string, unknown> }> {
  const res = await page.request.get(`${API_BASE}/users/me`, { headers: authHeaders(page) })
  expect(res.status()).toBe(200)
  return res.json()
}
