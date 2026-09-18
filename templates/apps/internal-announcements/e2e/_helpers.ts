// Shared helpers for internal-announcements flagship e2e specs.
//
// Every spec imports from here rather than rewriting auth/network
// plumbing per-test. The helpers are designed for the multi-app smoke
// suite where many flagships run in parallel against different ports —
// APP_BASE/API_BASE both honor the per-app VITE_PORT/API_PORT env vars
// the runner sets.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'ia') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI. Returns email/password and the
 *  JWT bearer token persisted to localStorage so callers can drive
 *  page.request.* with bearer auth.
 *
 *  Deterministic gating: arm POST /api/users BEFORE the click (so a
 *  fast response can't be missed), assert < 400, wait for nav off
 *  /signup, then poll until the JWT lands in localStorage. Without
 *  this, specs immediately calling seedAnnouncement/getCategories with
 *  the returned accessToken sometimes get a null token (React routes
 *  off /signup the moment POST resolves but the auth-state hook
 *  persists the JWT in a subsequent microtask → null/401 → "flaky"). */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  firstName = 'Test',
  lastName = 'User',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="given-name"]').first().fill(firstName)
  await page.locator('input[autocomplete="family-name"]').first().fill(lastName)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[autocomplete="new-password"]').first().fill(password)
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password)
  const submit = page
    .getByRole('button', { name: /create.*workspace|create.*account|sign\s*up/i })
    .first()
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
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(`${API_BASE}/users/me`)
  let userId: string | null = null
  if (userRes.ok()) {
    const me = (await userRes.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  return { email, password, accessToken, userId, firstName, lastName }
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
 * Log in and return the credentials the NEW session issued.
 *
 * Returns `accessToken` for the same reason `signup()` does: signing out
 * invalidates the previous bearer token, so a caller that re-logs in and keeps
 * sending the token it captured at signup gets a 401. Returning the fresh one
 * makes the correct token the convenient one.
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<{ accessToken: string | null }> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { accessToken: await getAccessToken(page) }
}

export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear())
}

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
    })
  }
  page.on('response', onResp as Parameters<typeof page.on>[1])
  try {
    await fn()
  } finally {
    page.off('response', onResp as Parameters<typeof page.on>[1])
  }
  return reqs
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface ApiCategory {
  id: string
  name: string
  color: string | null
  icon: string | null
}

export interface ApiAnnouncement {
  id: string
  title: string
  body: string
  category_id: string | null
  author_id: string
  priority: 'low' | 'normal' | 'high'
  status: 'draft' | 'scheduled' | 'published' | 'archived'
  is_pinned: boolean
  requires_acknowledgment: boolean
}

export interface ApiTeamMember {
  id: string
  name: string
  email: string | null
  role: string | null
  isAdmin: boolean
  isMe: boolean
}

/** Auth-bound REST helper for tests — pulls the bearer token from
 *  localStorage on the page and uses page.request to hit our API. */
export async function getCategories(
  page: Page,
  accessToken: string | null,
): Promise<ApiCategory[]> {
  const res = await page.request.get(`${API_BASE}/categories`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as ApiCategory[]
}

export async function listAnnouncements(
  page: Page,
  accessToken: string | null,
): Promise<ApiAnnouncement[]> {
  const res = await page.request.get(`${API_BASE}/announcements`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as ApiAnnouncement[]
}

export async function getTeam(page: Page, accessToken: string | null): Promise<ApiTeamMember[]> {
  const res = await page.request.get(`${API_BASE}/team`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as ApiTeamMember[]
}

/** Seed a published announcement via the API (faster than the UI form,
 *  for specs that need a row to act on). */
export async function seedAnnouncement(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    title: string
    body: string
    category_id: string | null
    priority: 'low' | 'normal' | 'high'
    is_pinned: boolean
    requires_acknowledgment: boolean
  }> = {},
): Promise<ApiAnnouncement> {
  // Default category = company if none specified.
  let category_id = overrides.category_id
  if (category_id === undefined) {
    const cats = await getCategories(page, accessToken)
    category_id = cats.find((c) => c.name === 'company')?.id ?? cats[0]?.id ?? null
  }
  const res = await page.request.post(`${API_BASE}/announcements`, {
    headers: authHeaders(accessToken),
    data: {
      title: overrides.title ?? `Spec announcement ${Date.now()}-${++counter}`,
      body: overrides.body ?? 'A real announcement body for the spec. Acknowledge if it lands.',
      category_id,
      priority: overrides.priority ?? 'normal',
      is_pinned: overrides.is_pinned ?? false,
      requires_acknowledgment: overrides.requires_acknowledgment ?? true,
      publish_now: true,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as ApiAnnouncement
}

/** Acknowledge an announcement as the current user. */
export async function ackAnnouncement(
  page: Page,
  accessToken: string | null,
  announcementId: string,
) {
  const res = await page.request.post(`${API_BASE}/announcements/${announcementId}/acknowledge`, {
    headers: authHeaders(accessToken),
    data: {},
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as { acknowledged: true; ack: { id: string } }
}

/** Get the current user's acknowledgment list. */
export async function myAcks(
  page: Page,
  accessToken: string | null,
): Promise<Array<{ announcement_id: string }>> {
  const res = await page.request.get(`${API_BASE}/announcements/me/acknowledgments`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBeLessThan(400)
  return (await res.json()) as Array<{ announcement_id: string }>
}

/** List an announcement's comments. */
export async function listComments(
  page: Page,
  accessToken: string | null,
  announcementId: string,
): Promise<Array<{ id: string; body: string; author_id: string }>> {
  const res = await page.request.get(`${API_BASE}/comments/${announcementId}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status()).toBeLessThan(400)
  return (await res.json()) as Array<{ id: string; body: string; author_id: string }>
}
