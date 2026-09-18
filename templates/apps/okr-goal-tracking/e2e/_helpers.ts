// e2e helpers for okr-goal-tracking. Every spec imports auth + base-URL
// utilities from here rather than rewriting the plumbing per-test.

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3080')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4080') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'ascent') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user via the UI signup form. The okr signup has three
 *  inputs: full name, work email, password. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Optional name input — fill if present so the user has a display name.
  const nameInput = page.locator('input[autocomplete="name"]').first()
  if (await nameInput.count().catch(() => 0)) {
    await nameInput.fill('Test User ' + Date.now().toString().slice(-6))
  }
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
  if (!accessToken) throw new Error('signup did not persist an access token')
  const userId: string | null = null
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. */
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
}

/** Sign out via the user menu. */
export async function logout(page: Page) {
  const menu = page
    .getByRole('button', { name: /open user menu|account|profile|user menu/i })
    .first()
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

export interface SeededObjective {
  id: string
  title: string
  scope: string
  status: string
}

export async function seedObjective(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    description: string
    scope: 'company' | 'team' | 'individual'
    status: 'on_track' | 'at_risk' | 'off_track' | 'completed'
    period_id: string | null
    team_id: string | null
  }> = {},
): Promise<SeededObjective> {
  const title = overrides.title ?? `Test Objective ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/objectives`, {
    headers: apiHeaders(accessToken),
    data: {
      title,
      description: overrides.description ?? 'An e2e seeded objective.',
      scope: overrides.scope ?? 'individual',
      status: overrides.status ?? 'on_track',
      period_id: overrides.period_id ?? null,
      team_id: overrides.team_id ?? null,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as { id: string; title: string; scope: string; status: string }
  return body
}

export interface SeededKeyResult {
  id: string
  objective_id: string
  title: string
  metric_type: string
  start_value: number | string
  target_value: number | string
  current_value: number | string
}

export async function seedKeyResult(
  page: Page,
  accessToken: string,
  args: {
    objective_id: string
    title?: string
    metric_type?: 'number' | 'percent' | 'percentage' | 'currency' | 'boolean' | 'milestone'
    start_value?: number
    target_value?: number
    current_value?: number
  },
): Promise<SeededKeyResult> {
  // Backend accepts: number | percent | boolean | milestone. The UI labels
  // are 'percentage' / 'currency'; map here so callers can pass either.
  const incoming = args.metric_type ?? 'number'
  const backendMetric =
    incoming === 'percentage' ? 'percent' : incoming === 'currency' ? 'number' : incoming
  const res = await page.request.post(`${API_BASE}/key-results`, {
    headers: apiHeaders(accessToken),
    data: {
      objective_id: args.objective_id,
      title: args.title ?? `KR ${Date.now()}-${++counter}`,
      metric_type: backendMetric,
      start_value: args.start_value ?? 0,
      target_value: args.target_value ?? 100,
      current_value: args.current_value ?? 0,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededKeyResult
}

export interface SeededTeam {
  id: string
  name: string
}

export async function seedTeam(
  page: Page,
  accessToken: string,
  overrides: Partial<{ name: string; description: string }> = {},
): Promise<SeededTeam> {
  const name = overrides.name ?? `Team ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/teams`, {
    headers: apiHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'An e2e seeded team.',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return (await res.json()) as SeededTeam
}
