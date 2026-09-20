// Shared helpers for the civic-311 flagship e2e specs.
//
// Specs assert on real outcomes — DB rows visible after reload, status
// transitions persisted, watch-area notifications landing in the feed.
// Auth + seed flows live here so a single broken signup doesn't snowball
// through the suite.

import {
  Page,
  expect,
  Request as PWRequest,
  Response as PWResponse,
} from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3021')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4021') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'c311'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface AuthedSession {
  email: string
  password: string
  accessToken: string
  userId: string
}

/**
 * Sign up via the UI. The civic-311 signup form collects name + email +
 * password. Returns credentials + the JWT bearer token persisted to the
 * httpOnly cookie.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<AuthedSession> {
  await page.goto(APP_BASE + '/signup')
  const nameInput = page.locator('#fullName, input[name="fullName"], input[name="name"]').first()
  if (await nameInput.count()) {
    await nameInput.fill('E2e Neighbor')
  }
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
 * Become city staff for the current (already-authed) session.
 *
 * Issue status transitions (submitted → acknowledged → in_review →
 * resolved/dismissed) and official response notes are gated behind
 * `isCityStaff` — which reads `users.role`, defaulting to 'resident' on a
 * fresh signup. This calls the dev-only `POST /api/_test/promote-staff`
 * endpoint (404 in production; served only when
 * `ENABLE_E2E_TEST_ENDPOINTS=true`, which the harness sets) to elevate the
 * caller's OWN row to `role = 'staff'`. So a staff e2e flow signs up a
 * fresh user and then becomes the operator — exercising the real staff
 * surfaces without weakening the gate for ordinary residents.
 */
export async function promoteToStaff(page: Page, accessToken?: string | null): Promise<void> {
  const token = accessToken ?? (await getAccessToken(page))
  const res = await page.request.post(`${API_BASE}/_test/promote-staff`, {
    headers: authHeaders(token),
    failOnStatusCode: false,
  })
  expect(res.status(), `POST /api/_test/promote-staff → ${res.status()}`).toBeLessThan(400)
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
  // The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie, readable in tests via the Playwright context. Its value IS the
  // JWT.
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

export interface SeededIssue {
  id: string
  category: string
  description: string
  status: string
  derived_address: string
  x: number
  y: number
  created_at: string
}

export async function seedIssue(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    category: string
    description: string
    x: number
    y: number
    photo_url: string | null
  }> = {},
): Promise<SeededIssue> {
  const data = {
    category: overrides.category ?? 'other',
    description: overrides.description ?? 'Generated by the civic-311 e2e suite — safe to delete.',
    x: overrides.x ?? 12.3,
    y: overrides.y ?? 45.6,
    ...(overrides.photo_url !== undefined ? { photo_url: overrides.photo_url } : {}),
  }
  const res = await page.request.post(`${API_BASE}/issues`, {
    headers: authHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as SeededIssue
}

export async function getIssue(
  page: Page,
  accessToken: string,
  id: string,
): Promise<
  SeededIssue & {
    events?: Array<{ id: string; kind: string }>
    confirmation_count?: number
    is_staff?: boolean
  }
> {
  const res = await page.request.get(`${API_BASE}/issues/${id}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as SeededIssue & {
    events?: Array<{ id: string; kind: string }>
    confirmation_count?: number
    is_staff?: boolean
  }
}

/** Create a watch area via the API (the UI path is covered by its own spec). */
export async function seedWatchArea(
  page: Page,
  accessToken: string,
  body: { name: string; x: number; y: number; radius: number },
): Promise<void> {
  const res = await page.request.post(`${API_BASE}/watch-areas`, {
    headers: authHeaders(accessToken),
    data: body,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
}

/** A tiny valid PNG for the photo-upload flow (1x1 transparent pixel). */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
