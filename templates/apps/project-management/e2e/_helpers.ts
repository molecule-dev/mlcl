// e2e helpers for the project-management flagship.
// Every spec file imports from this module rather than rewiring auth/network plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

/**
 * Return the browser to an anonymous state.
 *
 * Clearing localStorage is NOT enough: the persistent credential is an httpOnly
 * cookie, so a localStorage-only reset leaves the session live and every
 * auth-gated route keeps redirecting to /dashboard. A signup test that did that
 * then waited forever for a form the app was never going to render.
 *
 * @param page - The Playwright page to sign out.
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3040')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4040') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'forge') {
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

/** Sign up a fresh user via the UI and land on /dashboard. Returns the
 *  credentials AND the JWT bearer token from the httpOnly cookie set by the
 *  auth client so callers can authenticate page.request.* calls.
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit, assert 2xx, wait for navigation to /dashboard,
 *  then poll the cookie until the access token actually lands. Without
 *  these gates the access-token read sometimes ran before the auth-state
 *  hook persisted the token → throws "did not persist an access token"
 *  intermittently. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
  name = 'PM Test',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill(name)
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
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
  const meResp = await page.request.get(API_BASE + '/users/me')
  const meBody = meResp.ok()
    ? ((await meResp.json()) as { props?: { id?: string }; id?: string })
    : null
  const userId = meBody?.props?.id ?? meBody?.id ?? null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, name, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. Same hardening as signup(). */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
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

// ---------- domain seed helpers ----------

export async function seedProject(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    name: string
    description: string
    color: string
    status: 'active' | 'archived' | 'on_hold'
    due_date: string
  }> = {},
) {
  const name = overrides.name ?? `Project ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/projects`, {
    headers: apiHeaders(accessToken),
    data: {
      name,
      description: overrides.description,
      color: overrides.color ?? '#5b67d8',
      status: overrides.status,
      due_date: overrides.due_date,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; name: string }
  return { id: body.id, name: body.name }
}

export async function seedTask(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    description: string
    project_id: string
    status: 'todo' | 'in_progress' | 'in_review' | 'done'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: string
    assignee_id: string
  }> = {},
) {
  if (!overrides.project_id) throw new Error('seedTask: project_id is required')
  const res = await page.request.post(`${API_BASE}/tasks`, {
    headers: apiHeaders(accessToken),
    data: {
      title: overrides.title ?? `Task ${Date.now()}-${++counter}`,
      description: overrides.description,
      project_id: overrides.project_id,
      status: overrides.status ?? 'todo',
      priority: overrides.priority ?? 'medium',
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; title: string; status: string }
  return { id: body.id, title: body.title, status: body.status }
}

export async function seedMilestone(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    description: string
    project_id: string
    due_date: string
    status: 'open' | 'in_progress' | 'completed'
  }> = {},
) {
  if (!overrides.project_id) throw new Error('seedMilestone: project_id is required')
  const res = await page.request.post(`${API_BASE}/milestones`, {
    headers: apiHeaders(accessToken),
    data: {
      title: overrides.title ?? `Milestone ${Date.now()}-${++counter}`,
      description: overrides.description,
      project_id: overrides.project_id,
      due_date: overrides.due_date ?? new Date(Date.now() + 7 * 86400_000).toISOString(),
      status: overrides.status ?? 'open',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; title: string }
  return { id: body.id, title: body.title }
}
