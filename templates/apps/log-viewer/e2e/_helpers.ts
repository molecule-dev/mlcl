// e2e helpers for log-viewer (Signalink).
//
// Auth via the public signup form (POST /api/users) so each test gets
// a fresh isolated user. Demo data is seeded on first authenticated
// dashboard call: 8 streams, ~30 logs, 5 incidents, 4 alerts, 6 saved
// searches, 4 services, 3 traces.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3150')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4150') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'signal'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
}

/**
 * Sign up via the UI; lands on /dashboard. Returns the credentials.
 *
 * Hardening: gate on submit-enabled, arm the POST /api/users response
 * listener BEFORE the click, then poll until the JWT lands in
 * localStorage. Eliminates a race where the auth-state hook persisted
 * the token in a microtask AFTER React routed off /signup, so an
 * immediate `getAccessToken(page)` returned '' and authed page.request
 * calls 401-ed.
 */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Confirm field if present.
  const confirms = await page.locator('input[type="password"]').count()
  if (confirms > 1) {
    await page.locator('input[type="password"]').nth(1).fill(password)
  }
  // Optional T&C checkbox.
  const tc = page.getByRole('checkbox').first()
  if (await tc.count().catch(() => 0)) {
    if (!(await tc.isChecked())) await tc.check()
  }
  const submit = page
    .getByRole('button', { name: /create.*account|sign.*up|get.*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/**
 * Navigate to `url` and wait for the page's own data request matching
 * `urlPattern`. The response wait is ARMED BEFORE the goto.
 *
 * Arming after `page.goto` races the SPA's first fetch: a warm vite
 * server can deliver + execute the bundle before the load event that
 * resolves `goto`, so the XHR fires (and completes) before the listener
 * exists — the wait then times out even though the app is healthy. That
 * race failed whole specs intermittently-to-deterministically across
 * this suite.
 */
export async function gotoAndWait(
  page: Page,
  url: string,
  match: RegExp | ((r: { url(): string }) => boolean),
  timeout = 15_000,
): Promise<void> {
  const loaded = page.waitForResponse(
    (r) => (typeof match === 'function' ? match(r) : match.test(r.url())),
    { timeout },
  )
  await page.goto(url)
  await loaded
}

/**
 * Login an existing user via the UI.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign in|log in/i }).first()
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

/**
 * Capture network responses during a block. Returns
 * method/url/status tuples for assertions.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
    })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/**
 * Pull the persisted access token from the httpOnly cookie post-signup so
 * tests can call the API directly with a known JWT.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}
