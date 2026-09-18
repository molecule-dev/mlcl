// Shared test helpers for delivery-tracking e2e specs.
//
// Every spec imports from here rather than rewriting auth/network plumbing.
//
// Notes specific to this flagship:
//
// - The signup form lives at /signup with Name + Email Address + Password
//   fields and a "Create Account" submit. Post-signup → /dashboard.
// - The login form lives at /login with Email Address + Password.
//   Post-login → /dashboard.
// - Authentication is token-based — the @molecule/app-auth client stores
//   the persistent credential in an httpOnly `token` cookie ([M1-1]).
//   Use getAccessToken(page) to read the JWT from the Playwright context.
// - We use `getByLabel(...)` rather than `getByRole('textbox', ...)`
//   because password inputs don't expose a textbox role.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@parcel.test`
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

/** Sign up a fresh user; returns the credentials. Lands on /dashboard. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test Operator',
) {
  await page.goto(APP_BASE + '/signup')
  await page.getByLabel(/^Name$/i).fill(name)
  await page.getByLabel(/Email Address/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  const submit = page.getByRole('button', { name: /Create Account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  // Wait for dashboard bootstrap GETs to settle so the seeded shipments,
  // alerts, notifications and webhooks are present in subsequent reads.
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  // Poll until the auth-state hook has persisted the JWT to localStorage.
  // apiRequest() reads this token; without the poll, a fast post-signup
  // call can race the persistence and 401.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

/**
 * Promote the currently-authenticated user to the operator (`role = 'admin'`)
 * role via the dev-only `/api/_test/promote-admin` endpoint (fail-closed,
 * served only when ENABLE_E2E_TEST_ENDPOINTS=true, which the harness sets).
 *
 * Carrier writes are gated behind requireAdmin (finding P2H-3: carriers are a
 * global, tenant-shared catalog whose tracking URLs, if attacker-controlled,
 * would phish every user). So the carrier-management e2e signs up a fresh user
 * and then becomes the operator — exercising the real operator flow without
 * weakening the gate for ordinary users.
 */
export async function promoteToAdmin(page: Page): Promise<void> {
  const res = await apiRequest(page, 'POST', '/api/_test/promote-admin')
  expect(res.status, `POST /api/_test/promote-admin → ${res.status}`).toBeLessThan(400)
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/Email Address/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  const submit = page.getByRole('button', { name: /^Sign In$/i })
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture every network response during a block; useful for asserting the
 *  app actually called the API (not just that the click handler fired). */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
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

/** Start collecting console errors on the page. Returns a live array that
 *  fills up as the page logs errors — assert against it in your test. We
 *  filter benign noise (favicon 404s, generic resource load failures, and
 *  in-flight fetches the React component aborts during fast navigation).
 *  Real bugs still come through — bad selector errors, runtime exceptions,
 *  unhandled promise rejections from app code, etc. */
export function expectNoConsoleErrors(page: Page): string[] {
  const errs: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (/favicon|net::ERR_|Failed to load resource/i.test(text)) return
    // Navigation race: react-query / data hooks abort their in-flight
    // fetch when the component unmounts, which surfaces as
    // "TypeError: Failed to fetch" / "AbortError". These aren't real
    // failures — the next page just mounted and reissued the request.
    if (
      /TypeError: Failed to fetch|AbortError|signal is aborted|The operation was aborted/i.test(
        text,
      )
    )
      return
    errs.push(text)
  })
  return errs
}

/** Same as expectNoConsoleErrors but scoped to a block; throws if any
 *  fatal error is observed during fn. */
export async function expectNoConsoleErrorsDuring(page: Page, fn: () => Promise<void>) {
  const errs = expectNoConsoleErrors(page)
  await fn()
  expect(errs, 'console errors during interaction').toEqual([])
}

/** Normalise an API response body into the inner payload regardless of
 *  whether the handler returned a raw value, `{ data: ... }`, `{ props:
 *  ... }`, or an array. */
export function unwrap<T = unknown>(body: unknown): T {
  if (body === null || body === undefined) return body as T
  if (Array.isArray(body)) return body as T
  if (typeof body !== 'object') return body as T
  const obj = body as Record<string, unknown>
  if ('data' in obj && obj.data !== undefined) return obj.data as T
  if ('props' in obj && obj.props !== undefined) return obj.props as T
  return body as T
}

/** Helper for the common case of an array endpoint — returns [] when the
 *  payload doesn't look like a list. */
export function asList<T = unknown>(body: unknown): T[] {
  const u = unwrap<unknown>(body)
  if (Array.isArray(u)) return u as T[]
  if (u && typeof u === 'object' && 'items' in (u as Record<string, unknown>)) {
    const items = (u as Record<string, unknown>).items
    return Array.isArray(items) ? (items as T[]) : []
  }
  return []
}

/** Issue an authed API request from inside the page so the auth bond's
 *  Bearer token (from the httpOnly cookie, read via the Playwright context)
 *  is automatically attached. Playwright's page.request would not have the
 *  cookie-based auth context. */
export async function apiRequest<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  // [M1-1] Read the token from the cookie jar (Playwright context) before
  // entering page.evaluate — browser-side localStorage no longer holds it.
  const token = await getAccessToken(page)
  return page.evaluate(
    async ({ method, path, body, token }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const resp = await fetch(path, {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      let parsed: unknown = null
      try {
        parsed = await resp.json()
      } catch {
        // some responses are 204 / non-JSON
      }
      return { status: resp.status, body: parsed as never }
    },
    { method, path, body, token },
  )
}
