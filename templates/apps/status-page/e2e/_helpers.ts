// E2E helpers for the status-page (Vigil) flagship.
// Every spec uses these to sign up an isolated user and exercise the
// real backend (no upstream mocks, no fake data). The signup helper
// drives the SPA's auth bond directly so subsequent navigations are
// authenticated without re-traversing /signup each test.

import { Page, expect, APIResponse } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'vigil') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

const tokenByPage = new WeakMap<Page, string>()

function authHeaders(page: Page): Record<string, string> {
  const tok = tokenByPage.get(page)
  return tok ? { Authorization: `Bearer ${tok}` } : {}
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

export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Vigil Tester' },
  })
  expect(res.status(), `signup should return 201, got body: ${await safeText(res)}`).toBe(201)
  const body = await res.json()
  if (!body.accessToken) {
    throw new Error('signup did not return accessToken: ' + JSON.stringify(body))
  }
  // Molecule's user resource wraps the new user under either `user` or `props`.
  const userPayload = (body.user ?? body.props ?? {}) as Record<string, unknown>
  const userId = (userPayload.id as string | undefined) ?? ''
  tokenByPage.set(page, body.accessToken as string)
  return {
    email,
    password,
    accessToken: body.accessToken as string,
    userId,
  }
}

export async function signupViaUI(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })

  // Vigil's signup form fields (id-based — robust against label changes).
  const fillIfPresent = async (selector: string, value: string) => {
    const el = page.locator(selector).first()
    if ((await el.count().catch(() => 0)) > 0) await el.fill(value)
  }
  await fillIfPresent('#first-name', 'Vigil')
  await fillIfPresent('#last-name', 'Tester')
  await fillIfPresent('#company', `Company-${Date.now()}`)
  await fillIfPresent('#signup-email', email)
  await fillIfPresent('#signup-password', password)
  await fillIfPresent('#signup-confirm', password)
  // Some scaffolds use generic ids — fall back to label.
  if ((await page.locator('#signup-email').count()) === 0) {
    await page
      .getByLabel(/Work email|Email/i)
      .first()
      .fill(email)
  }
  if ((await page.locator('#signup-password').count()) === 0) {
    await page
      .getByLabel(/^Password$/i)
      .first()
      .fill(password)
    const confirm = page.getByLabel(/Confirm.*password|Password.*confirm/i).first()
    if ((await confirm.count().catch(() => 0)) > 0) await confirm.fill(password)
  }
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if ((await terms.count().catch(() => 0)) > 0) await terms.check()

  const submit = page
    .getByRole('button', { name: /Request access|Create.*account|Sign\s*up|Get started/i })
    .first()
  // Hardening (mirrors virtual-classroom b296e327d): gate submit on
  // enabled, arm POST listener BEFORE click so a fast response can't
  // be missed, then assert response < 400, nav off /signup, and poll
  // until the access token is readable from localStorage.
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const respPromise = page.waitForResponse(
    (resp) => /\/api\/users(\?|$|\/)/.test(resp.url()) && resp.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await respPromise
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup$/, { timeout: 15_000 })
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
  return { email, password }
}

export async function createComponent(
  page: Page,
  args: { name: string; group?: string; description?: string },
): Promise<{ id: string; name: string; status: string; group: string | null }> {
  const res = await page.request.post(`${API_BASE}/components`, {
    headers: authHeaders(page),
    data: { name: args.name, group: args.group ?? '', description: args.description ?? '' },
  })
  expect(res.status(), `POST /components should be 201, got: ${await safeText(res)}`).toBe(201)
  const body = await res.json()
  return body
}

export async function setComponentStatus(
  page: Page,
  id: string,
  status:
    | 'operational'
    | 'degraded_performance'
    | 'partial_outage'
    | 'major_outage'
    | 'under_maintenance',
): Promise<void> {
  const res = await page.request.put(`${API_BASE}/components/${id}/status`, {
    headers: authHeaders(page),
    data: { status },
  })
  expect(res.status(), `PUT status should be 200, got: ${await safeText(res)}`).toBe(200)
}

export async function createIncident(
  page: Page,
  args: {
    title: string
    impact?: 'minor' | 'major' | 'critical' | 'none'
    status?: 'investigating' | 'identified' | 'monitoring' | 'resolved'
    message?: string
    affected?: string[]
  },
): Promise<{ id: string; title: string; status: string }> {
  const res = await page.request.post(`${API_BASE}/incidents`, {
    headers: authHeaders(page),
    data: {
      title: args.title,
      impact: args.impact ?? 'minor',
      status: args.status ?? 'investigating',
      message: args.message ?? '',
      affected_components: args.affected ?? [],
    },
  })
  expect(res.status(), `POST /incidents should be 201, got: ${await safeText(res)}`).toBe(201)
  return res.json()
}

export async function postIncidentUpdate(
  page: Page,
  incidentId: string,
  args: { status: 'investigating' | 'identified' | 'monitoring' | 'resolved'; message: string },
): Promise<void> {
  const res = await page.request.post(`${API_BASE}/incidents/${incidentId}/updates`, {
    headers: authHeaders(page),
    data: args,
  })
  expect(res.status(), `POST incident update should be 201, got: ${await safeText(res)}`).toBe(201)
}

export async function createMaintenance(
  page: Page,
  args: { title: string; scheduledFor: string; scheduledUntil: string; affected?: string[] },
): Promise<{ id: string; title: string; status: string }> {
  const res = await page.request.post(`${API_BASE}/maintenance`, {
    headers: authHeaders(page),
    data: {
      title: args.title,
      scheduled_for: args.scheduledFor,
      scheduled_until: args.scheduledUntil,
      affected_components: args.affected ?? [],
    },
  })
  expect(res.status(), `POST /maintenance should be 201, got: ${await safeText(res)}`).toBe(201)
  return res.json()
}

export async function createSubscriber(
  page: Page,
  args: { email: string; notificationType?: 'all' | 'incidents' | 'maintenance' },
): Promise<{ id: string; destination: string }> {
  const res = await page.request.post(`${API_BASE}/subscribers`, {
    headers: authHeaders(page),
    data: {
      email: args.email,
      channel: 'email',
      notification_type: args.notificationType ?? 'all',
      components: ['all'],
    },
  })
  expect(res.status(), `POST /subscribers should be 201, got: ${await safeText(res)}`).toBe(201)
  return res.json()
}

export async function createTeamMember(
  page: Page,
  args: { name: string; email: string; role?: string },
): Promise<{ id: string; name: string; email: string }> {
  const res = await page.request.post(`${API_BASE}/team`, {
    headers: authHeaders(page),
    data: { name: args.name, email: args.email, role: args.role ?? 'operator' },
  })
  expect(res.status(), `POST /team should be 201, got: ${await safeText(res)}`).toBe(201)
  return res.json()
}

export async function listAudit(
  page: Page,
): Promise<Array<{ action: string; target: string | null; summary: string | null }>> {
  const res = await page.request.get(`${API_BASE}/audit`, { headers: authHeaders(page) })
  expect(res.status(), `GET /audit should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function listAuditFiltered(
  page: Page,
  filters: { scope?: string; action?: string; target?: string },
): Promise<Array<{ action: string; target: string | null; summary: string | null }>> {
  const params = new URLSearchParams()
  if (filters.scope) params.set('scope', filters.scope)
  if (filters.action) params.set('action', filters.action)
  if (filters.target) params.set('target', filters.target)
  const res = await page.request.get(`${API_BASE}/audit?${params.toString()}`, {
    headers: authHeaders(page),
  })
  expect(res.status(), `GET /audit should be 200, got: ${await safeText(res)}`).toBe(200)
  return res.json()
}

export async function safeText(res: APIResponse): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

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
