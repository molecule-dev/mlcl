// Shared helpers for newsletter flagship e2e specs. Every spec imports from
// here rather than rewriting auth/network plumbing.
//
// The newsletter signup form has only email + password (no first/last name);
// `signup()` accommodates both shapes by calling the API directly when
// possible and falling back to the UI form.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'newsletter') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI. Returns the credentials AND the
 *  JWT bearer token persisted to localStorage so callers can drive
 *  page.request.* with bearer auth.
 *
 *  Generous timeout (45s) because the e2e suite hammers the dev server
 *  with hundreds of sequential signups; later tests can see vite/express
 *  queue up under sustained load. A real user signup is sub-second. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up|join/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token in
  // localStorage AFTER nav (auth-state hook persists JWT in a microtask
  // after React routes — naive nav-wait races subsequent api() calls).
  // See virtual-classroom/_helpers.ts for the full rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 45000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const meResp = await page.request.get(`${API_BASE}/users/me`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
  const me = meResp.ok() ? ((await meResp.json()) as { props?: { id?: string } }) : null
  const userId = me?.props?.id ?? null
  return { email, password, accessToken, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#login-email, input[type="email"]').first().fill(email)
  await page.locator('#login-password, input[type="password"]').first().fill(password)
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
}

export async function logout(page: Page) {
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

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
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

/** Helper: create an issue via API for tests that depend on one.
 *  Returns the issue id + subject so specs can navigate to it. */
export async function seedIssue(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    subject: string
    preview_text: string
    body_md: string
    status: 'draft' | 'published' | 'scheduled'
    publish_at: string
  }> = {},
): Promise<{ id: string; subject: string }> {
  const subject = overrides.subject ?? `Spec Issue ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/issues`, {
    headers: authHeaders(accessToken),
    data: {
      subject,
      preview_text: overrides.preview_text ?? 'Excerpt for the spec issue.',
      body_md: overrides.body_md ?? '## Hello\n\nBody for the spec issue.',
      status: overrides.status ?? 'draft',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { id: string }
  return { id: body.id, subject }
}

/** Helper: manually add a subscriber via API. Returns the row incl. token. */
export async function seedSubscriber(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{ email: string; tier: 'free' | 'paid' }> = {},
): Promise<{ id: string; email: string; token: string }> {
  const email = overrides.email ?? uniqueEmail('reader')
  const res = await page.request.post(`${API_BASE}/subscribers`, {
    headers: authHeaders(accessToken),
    data: { email, tier: overrides.tier ?? 'free' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as { id: string; email: string; token: string }
}

/** Helper: read an issue's stats (delivered/opened/clicked + series). */
export async function readIssueStats(
  page: Page,
  accessToken: string | null,
  issueId: string,
): Promise<{
  delivered: number
  opened: number
  clicked: number
  open_rate: number
  opens_over_time: Array<{ date: string; count: number }>
}> {
  const res = await page.request.get(`${API_BASE}/issues/${issueId}/stats`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as {
    delivered: number
    opened: number
    clicked: number
    open_rate: number
    opens_over_time: Array<{ date: string; count: number }>
  }
}
